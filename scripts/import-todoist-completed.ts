#!/usr/bin/env npx tsx
/**
 * Import completed tasks from Todoist into Intend
 *
 * Usage:
 *   npx tsx scripts/import-todoist-completed.ts <TODOIST_API_TOKEN> <EMAIL> <PASSWORD> [LIMIT]
 *
 * The LIMIT parameter controls how many completed tasks to fetch (default: 200)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TODOIST_SYNC_API = 'https://api.todoist.com/sync/v9';

function loadEnv(): { supabaseUrl: string; supabaseKey: string } {
  const envPath = resolve(__dirname, '../.env');
  const envContent = readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');

  let supabaseUrl = '';
  let supabaseKey = '';

  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.slice('VITE_SUPABASE_URL='.length).trim();
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.slice('VITE_SUPABASE_ANON_KEY='.length).trim();
    }
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials in .env');
  }

  return { supabaseUrl, supabaseKey };
}

// ---------------------------------------------------------------------------
// Todoist API Types
// ---------------------------------------------------------------------------

interface TodoistCompletedItem {
  id: string;
  task_id: string;
  content: string;
  project_id: string;
  section_id: string | null;
  completed_at: string; // ISO timestamp
}

interface TodoistCompletedResponse {
  items: TodoistCompletedItem[];
  projects: Record<string, { name: string; color: string }>;
}

// ---------------------------------------------------------------------------
// Fetch Completed Tasks
// ---------------------------------------------------------------------------

async function fetchCompletedTasks(
  token: string,
  limit: number = 200
): Promise<TodoistCompletedItem[]> {
  const allItems: TodoistCompletedItem[] = [];
  let offset = 0;
  const batchSize = 50; // Todoist max per request

  console.log(`Fetching completed tasks (limit: ${limit})...`);

  while (allItems.length < limit) {
    const remaining = limit - allItems.length;
    const fetchCount = Math.min(batchSize, remaining);

    const res = await fetch(`${TODOIST_SYNC_API}/completed/get_all`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `limit=${fetchCount}&offset=${offset}`,
    });

    if (!res.ok) {
      throw new Error(`Todoist API error: ${res.status} ${res.statusText}`);
    }

    const data: TodoistCompletedResponse = await res.json();

    if (data.items.length === 0) {
      break; // No more items
    }

    allItems.push(...data.items);
    offset += data.items.length;

    process.stdout.write(`  Fetched ${allItems.length} completed tasks...\r`);

    if (data.items.length < fetchCount) {
      break; // Reached the end
    }
  }

  console.log(`  Fetched ${allItems.length} completed tasks total`);
  return allItems;
}

// ---------------------------------------------------------------------------
// Import Logic
// ---------------------------------------------------------------------------

async function importCompletedTasks(
  todoistToken: string,
  supabase: ReturnType<typeof createClient>,
  userId: string,
  limit: number
) {
  // First, get the project ID mapping from existing Intend projects
  console.log('\nFetching existing Intend projects for ID mapping...');

  const { data: opusProjects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name');

  if (projectsError) {
    throw new Error(`Failed to fetch projects: ${projectsError.message}`);
  }

  // We need to map Todoist project IDs to Intend project IDs
  // Since we don't have the original Todoist IDs stored, we'll match by name
  const projectNameToId = new Map<string, string>();
  for (const p of opusProjects || []) {
    projectNameToId.set(p.name.toLowerCase(), p.id);
  }

  // Also fetch Todoist projects to get name mappings
  const todoistProjectsRes = await fetch('https://api.todoist.com/rest/v2/projects', {
    headers: { Authorization: `Bearer ${todoistToken}` },
  });
  const todoistProjects = await todoistProjectsRes.json();

  const todoistIdToName = new Map<string, string>();
  let inboxProjectId: string | null = null;
  for (const p of todoistProjects) {
    todoistIdToName.set(p.id, p.name);
    if (p.is_inbox_project) {
      inboxProjectId = p.id;
    }
  }

  // Fetch completed tasks from Todoist
  const completedTasks = await fetchCompletedTasks(todoistToken, limit);

  console.log(`\nImporting ${completedTasks.length} completed tasks...`);

  let imported = 0;
  let skipped = 0;

  for (const item of completedTasks) {
    // Find the Intend project ID by matching names
    const todoistProjectName = todoistIdToName.get(item.project_id);
    const isInboxTask = item.project_id === inboxProjectId;

    let opusProjectId: string | null = null;
    if (!isInboxTask && todoistProjectName) {
      opusProjectId = projectNameToId.get(todoistProjectName.toLowerCase()) || null;
    }

    // Skip if we can't find the project (and it's not inbox)
    if (!isInboxTask && !opusProjectId) {
      skipped++;
      continue;
    }

    // Check if this exact completion already exists (by title AND completed_at timestamp)
    // This allows multiple completions of recurring tasks while avoiding true duplicates
    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('title', item.content)
      .eq('status', 'done')
      .eq('completed_at', item.completed_at)
      .limit(1);

    if (existing && existing.length > 0) {
      // This exact completion already imported, skip
      skipped++;
      continue;
    }

    // Insert the completed task
    const { error } = await supabase.from('tasks').insert({
      owner_id: userId,
      project_id: opusProjectId,
      section_id: null, // We don't have section mapping for completed tasks
      title: item.content,
      description: null,
      status: 'done',
      priority: 0,
      completed_at: item.completed_at,
      sort_order: 0,
    });

    if (error) {
      console.error(`  ✗ Failed to insert "${item.content}": ${error.message}`);
      continue;
    }

    imported++;
    if (imported % 10 === 0) {
      process.stdout.write(`  Imported ${imported} tasks...\r`);
    }
  }

  console.log(`\n\n${'='.repeat(60)}`);
  console.log('Completed tasks import finished!');
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped (no project match or duplicate): ${skipped}`);
  console.log('='.repeat(60));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const token = process.argv[2];
  const email = process.argv[3];
  const password = process.argv[4];
  const limit = parseInt(process.argv[5] || '200', 10);

  if (!token || !email || !password) {
    console.error('Usage: npx tsx scripts/import-todoist-completed.ts <TODOIST_TOKEN> <EMAIL> <PASSWORD> [LIMIT]');
    console.error('\nLIMIT defaults to 200 completed tasks');
    process.exit(1);
  }

  const { supabaseUrl, supabaseKey } = loadEnv();
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Login
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(`Login failed: ${error?.message || 'Unknown error'}`);
  }
  console.log(`✓ Logged in as ${data.user.email}`);

  try {
    await importCompletedTasks(token, supabase, data.user.id, limit);
  } catch (err) {
    console.error('\nImport failed:', err);
    process.exit(1);
  }
}

main();
