#!/usr/bin/env npx tsx
/**
 * Backfill todoist_id on existing Intend records
 *
 * Usage:
 *   npx tsx scripts/backfill-todoist-ids.ts <TODOIST_API_TOKEN> [EMAIL] [PASSWORD]
 *
 * Run this ONCE if you imported data before sync support was added.
 * It matches existing Intend records to Todoist by name/title and sets the todoist_id.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const TODOIST_API_BASE = 'https://api.todoist.com/rest/v2';

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Todoist types
interface TodoistProject {
  id: string;
  name: string;
  is_inbox_project: boolean;
}

interface TodoistSection {
  id: string;
  project_id: string;
  name: string;
}

interface TodoistTask {
  id: string;
  project_id: string;
  section_id: string | null;
  content: string;
}

async function fetchTodoist<T>(token: string, endpoint: string): Promise<T> {
  const res = await fetch(`${TODOIST_API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Todoist API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

async function backfillTodoistIds(
  todoistToken: string,
  supabase: SupabaseClient,
  userId: string
) {
  console.log('Fetching from Todoist API...');

  const [todoistProjects, todoistSections, todoistTasks] = await Promise.all([
    fetchTodoist<TodoistProject[]>(todoistToken, '/projects'),
    fetchTodoist<TodoistSection[]>(todoistToken, '/sections'),
    fetchTodoist<TodoistTask[]>(todoistToken, '/tasks'),
  ]);

  console.log(`  ${todoistProjects.length} projects`);
  console.log(`  ${todoistSections.length} sections`);
  console.log(`  ${todoistTasks.length} tasks`);

  // Fetch existing Intend data without todoist_ids
  const [opusProjects, opusSections, opusTasks] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, todoist_id')
      .eq('owner_id', userId)
      .is('todoist_id', null),
    supabase.from('sections').select('id, name, project_id, todoist_id').is('todoist_id', null),
    supabase
      .from('tasks')
      .select('id, title, project_id, section_id, todoist_id')
      .eq('owner_id', userId)
      .is('todoist_id', null),
  ]);

  const inboxProjectId = todoistProjects.find(p => p.is_inbox_project)?.id;

  // Build project name → todoist_id map (excluding inbox)
  const todoistProjectByName = new Map<string, string>();
  for (const p of todoistProjects) {
    if (!p.is_inbox_project) {
      todoistProjectByName.set(p.name.toLowerCase(), p.id);
    }
  }

  // -------------------------------------------------------------------------
  // 1. Match Projects
  // -------------------------------------------------------------------------
  console.log('\nMatching projects...');
  let projectsMatched = 0;

  // Also need to build intend project id → todoist project id for section/task matching
  const opusProjectToTodoist = new Map<string, string>();

  // First, get ALL intend projects to build the mapping (including those with todoist_id)
  const { data: allIntendProjects } = await supabase
    .from('projects')
    .select('id, name, todoist_id')
    .eq('owner_id', userId);

  for (const p of allIntendProjects || []) {
    if (p.todoist_id) {
      opusProjectToTodoist.set(p.id, p.todoist_id);
    }
  }

  for (const opusProject of opusProjects.data || []) {
    const todoistId = todoistProjectByName.get(opusProject.name.toLowerCase());
    if (todoistId) {
      const { error } = await supabase
        .from('projects')
        .update({ todoist_id: todoistId })
        .eq('id', opusProject.id);

      if (!error) {
        opusProjectToTodoist.set(opusProject.id, todoistId);
        console.log(`  ✓ ${opusProject.name}`);
        projectsMatched++;
      } else {
        console.error(`  ✗ ${opusProject.name}: ${error.message}`);
      }
    } else {
      console.log(`  ? ${opusProject.name} (no match in Todoist)`);
    }
  }

  // -------------------------------------------------------------------------
  // 2. Match Sections
  // -------------------------------------------------------------------------
  console.log('\nMatching sections...');
  let sectionsMatched = 0;

  // Build section key (project_id + name) → todoist_id
  const todoistSectionByKey = new Map<string, string>();
  for (const s of todoistSections) {
    const key = `${s.project_id}:${s.name.toLowerCase()}`;
    todoistSectionByKey.set(key, s.id);
  }

  // Also build intend section id → todoist section id for task matching
  const opusSectionToTodoist = new Map<string, string>();

  const { data: allIntendSections } = await supabase
    .from('sections')
    .select('id, name, project_id, todoist_id');

  for (const s of allIntendSections || []) {
    if (s.todoist_id) {
      opusSectionToTodoist.set(s.id, s.todoist_id);
    }
  }

  for (const opusSection of opusSections.data || []) {
    const todoistProjectId = opusSection.project_id
      ? opusProjectToTodoist.get(opusSection.project_id)
      : null;

    if (!todoistProjectId) {
      console.log(`  ? ${opusSection.name} (project not matched)`);
      continue;
    }

    const key = `${todoistProjectId}:${opusSection.name.toLowerCase()}`;
    const todoistId = todoistSectionByKey.get(key);

    if (todoistId) {
      const { error } = await supabase
        .from('sections')
        .update({ todoist_id: todoistId })
        .eq('id', opusSection.id);

      if (!error) {
        opusSectionToTodoist.set(opusSection.id, todoistId);
        console.log(`  ✓ ${opusSection.name}`);
        sectionsMatched++;
      } else {
        console.error(`  ✗ ${opusSection.name}: ${error.message}`);
      }
    } else {
      console.log(`  ? ${opusSection.name} (no match in Todoist)`);
    }
  }

  // -------------------------------------------------------------------------
  // 3. Match Tasks
  // -------------------------------------------------------------------------
  console.log('\nMatching tasks...');
  let tasksMatched = 0;

  // Build task key (project_id + section_id + title) → todoist_id
  // Using title since content in Todoist maps to title in Intend
  const todoistTaskByKey = new Map<string, string>();
  for (const t of todoistTasks) {
    // Use project:section:title as key
    const key = `${t.project_id}:${t.section_id || ''}:${t.content.toLowerCase()}`;
    todoistTaskByKey.set(key, t.id);
  }

  for (const opusTask of opusTasks.data || []) {
    // Find corresponding Todoist project ID
    let todoistProjectId: string | null = null;

    if (opusTask.project_id) {
      todoistProjectId = opusProjectToTodoist.get(opusTask.project_id) || null;
    } else {
      // Inbox task
      todoistProjectId = inboxProjectId || null;
    }

    if (!todoistProjectId) {
      console.log(`  ? ${opusTask.title.slice(0, 40)}... (project not matched)`);
      continue;
    }

    // Find corresponding Todoist section ID
    const todoistSectionId = opusTask.section_id
      ? opusSectionToTodoist.get(opusTask.section_id) || ''
      : '';

    const key = `${todoistProjectId}:${todoistSectionId}:${opusTask.title.toLowerCase()}`;
    const todoistId = todoistTaskByKey.get(key);

    if (todoistId) {
      const { error } = await supabase
        .from('tasks')
        .update({ todoist_id: todoistId })
        .eq('id', opusTask.id);

      if (!error) {
        const preview = opusTask.title.slice(0, 40) + (opusTask.title.length > 40 ? '...' : '');
        console.log(`  ✓ ${preview}`);
        tasksMatched++;
      } else {
        console.error(`  ✗ ${opusTask.title}: ${error.message}`);
      }
    } else {
      const preview = opusTask.title.slice(0, 40) + (opusTask.title.length > 40 ? '...' : '');
      console.log(`  ? ${preview} (no match in Todoist)`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Backfill complete!');
  console.log(`  Projects matched: ${projectsMatched}`);
  console.log(`  Sections matched: ${sectionsMatched}`);
  console.log(`  Tasks matched:    ${tasksMatched}`);
  console.log('='.repeat(60));
  console.log('\nYou can now run sync-todoist.ts safely!');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

import * as readline from 'readline';

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const token = process.argv[2];
  const email = process.argv[3];
  const password = process.argv[4];

  if (!token) {
    console.error('Usage: npx tsx scripts/backfill-todoist-ids.ts <TODOIST_TOKEN> [EMAIL] [PASSWORD]');
    process.exit(1);
  }

  const { supabaseUrl, supabaseKey } = loadEnv();

  try {
    let userId: string;
    let supabase: SupabaseClient;

    if (email && password) {
      supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        throw new Error(`Login failed: ${error?.message || 'Unknown error'}`);
      }
      console.log(`✓ Logged in as ${data.user.email}`);
      userId = data.user.id;
    } else {
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log('\nLog in to your Intend account:');
      const userEmail = await prompt('  Email: ');
      const userPassword = await prompt('  Password: ');

      const { data, error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: userPassword,
      });

      if (error || !data.user) {
        throw new Error(`Login failed: ${error?.message || 'Unknown error'}`);
      }

      console.log(`✓ Logged in as ${data.user.email}`);
      userId = data.user.id;
    }

    await backfillTodoistIds(token, supabase, userId);
  } catch (err) {
    console.error('\nBackfill failed:', err);
    process.exit(1);
  }
}

main();
