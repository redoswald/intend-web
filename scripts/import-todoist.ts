#!/usr/bin/env npx tsx
/**
 * Import Todoist data into Intend
 *
 * Usage:
 *   npx tsx scripts/import-todoist.ts <TODOIST_API_TOKEN>
 *
 * What it does:
 *   1. Fetches all projects, sections, and tasks from Todoist
 *   2. Transforms them to Intend format
 *   3. Inserts into Supabase (requires you to be logged in)
 */

import { createClient } from '@supabase/supabase-js';
import { todoistToRRule } from '../src/lib/recurrenceConverter';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TODOIST_API_BASE = 'https://api.todoist.com/rest/v2';

// Load from .env manually since we're not using Vite
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

// ---------------------------------------------------------------------------
// Todoist API Types
// ---------------------------------------------------------------------------

interface TodoistProject {
  id: string;
  parent_id: string | null;
  order: number;
  color: string;
  name: string;
  is_inbox_project: boolean;
  is_archived: boolean;
  description: string;
}

interface TodoistSection {
  id: string;
  project_id: string;
  order: number;
  name: string;
}

interface TodoistTask {
  id: string;
  project_id: string;
  section_id: string | null;
  parent_id: string | null;
  order: number;
  content: string;
  description: string;
  is_completed: boolean;
  priority: number;
  due: {
    date: string;
    datetime?: string;
    string: string;
    is_recurring: boolean;
  } | null;
  deadline: {
    date: string;
    lang: string;
  } | null;
  labels: string[];
  created_at: string;
}

// ---------------------------------------------------------------------------
// Color Mapping
// ---------------------------------------------------------------------------

const TODOIST_COLORS: Record<string, string> = {
  berry_red: '#b8255f',
  red: '#db4035',
  orange: '#ff9933',
  yellow: '#fad000',
  olive_green: '#afb83b',
  lime_green: '#7ecc49',
  green: '#299438',
  mint_green: '#6accbc',
  teal: '#158fad',
  sky_blue: '#14aaf5',
  light_blue: '#96c3eb',
  blue: '#4073ff',
  grape: '#884dff',
  violet: '#af38eb',
  lavender: '#eb96eb',
  magenta: '#e05194',
  salmon: '#ff8d85',
  charcoal: '#808080',
  grey: '#b8b8b8',
  taupe: '#ccac93',
};

function convertColor(todoistColor: string): string {
  return TODOIST_COLORS[todoistColor] || '#808080';
}

// ---------------------------------------------------------------------------
// Priority Mapping
// Todoist: 1 = lowest (none), 2 = low, 3 = medium, 4 = urgent (high)
// Intend:    0 = none,          1 = low, 2 = medium, 3 = high
// ---------------------------------------------------------------------------

function convertPriority(todoistPriority: number): number {
  // Todoist 1 → Intend 0, Todoist 4 → Intend 3
  return Math.max(0, todoistPriority - 1);
}

// ---------------------------------------------------------------------------
// Date/Time Parsing
// ---------------------------------------------------------------------------

function parseDue(due: TodoistTask['due']): {
  due_date: string | null;
  due_time: string | null;
  recurrence_rule: string | null;
  recurrence_base_date: string | null;
} {
  if (!due) {
    return {
      due_date: null,
      due_time: null,
      recurrence_rule: null,
      recurrence_base_date: null,
    };
  }

  let due_date: string | null = due.date;
  let due_time: string | null = null;

  // If datetime exists, extract time
  if (due.datetime) {
    // Format: "2026-02-04T06:30:00"
    const dt = new Date(due.datetime);
    due_date = due.datetime.split('T')[0];
    due_time = dt.toTimeString().slice(0, 5); // "HH:MM"
  }

  let recurrence_rule: string | null = null;
  let recurrence_base_date: string | null = null;

  if (due.is_recurring && due.string) {
    const result = todoistToRRule(due.string);
    recurrence_rule = result.rrule;
    recurrence_base_date = due_date;
  }

  return { due_date, due_time, recurrence_rule, recurrence_base_date };
}

// ---------------------------------------------------------------------------
// Todoist API Fetchers
// ---------------------------------------------------------------------------

async function fetchTodoist<T>(token: string, endpoint: string): Promise<T> {
  const res = await fetch(`${TODOIST_API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Todoist API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

async function fetchAllTodoistData(token: string) {
  console.log('Fetching from Todoist API...');

  const [projects, sections, tasks] = await Promise.all([
    fetchTodoist<TodoistProject[]>(token, '/projects'),
    fetchTodoist<TodoistSection[]>(token, '/sections'),
    fetchTodoist<TodoistTask[]>(token, '/tasks'),
  ]);

  console.log(`  ${projects.length} projects`);
  console.log(`  ${sections.length} sections`);
  console.log(`  ${tasks.length} tasks`);

  return { projects, sections, tasks };
}

// ---------------------------------------------------------------------------
// Import Logic
// ---------------------------------------------------------------------------

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

async function loginAndGetUserId(
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ userId: string; supabase: ReturnType<typeof createClient> }> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('\nLog in to your Intend account:');
  const email = await prompt('  Email: ');
  const password = await prompt('  Password: ');

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    throw new Error(`Login failed: ${error?.message || 'Unknown error'}`);
  }

  console.log(`\n✓ Logged in as ${data.user.email}`);
  return { userId: data.user.id, supabase };
}

async function importToIntendWithAuth(
  todoistToken: string,
  supabase: ReturnType<typeof createClient>,
  userId: string
) {
  // Fetch all Todoist data
  const { projects, sections, tasks } = await fetchAllTodoistData(todoistToken);

  // ID mappings: Todoist ID → Intend UUID
  const projectIdMap = new Map<string, string>();
  const sectionIdMap = new Map<string, string>();
  const taskIdMap = new Map<string, string>();

  // Track the inbox project ID (we'll skip it, tasks go to project_id = null)
  let inboxProjectId: string | null = null;

  // -------------------------------------------------------------------------
  // 1. Import Projects (in order, handling hierarchy)
  // -------------------------------------------------------------------------
  console.log('\nImporting projects...');

  // Sort by order to maintain hierarchy
  const sortedProjects = [...projects].sort((a, b) => a.order - b.order);

  // First pass: identify inbox
  for (const p of sortedProjects) {
    if (p.is_inbox_project) {
      inboxProjectId = p.id;
      console.log(`  Skipping Inbox project (tasks will have project_id = null)`);
    }
  }

  // Second pass: insert projects (parents first, by sorting)
  const projectsToInsert = sortedProjects.filter(p => !p.is_inbox_project);
  const insertedProjectIds = new Set<string>();

  // Keep trying until all projects are inserted (handles parent dependencies)
  let remaining: TodoistProject[] = [...projectsToInsert];
  let maxIterations = 10;

  while (remaining.length > 0 && maxIterations > 0) {
    const stillRemaining: typeof remaining = [];

    for (const p of remaining) {
      const canInsert =
        p.parent_id === null ||
        p.parent_id === inboxProjectId ||
        insertedProjectIds.has(p.parent_id);

      if (!canInsert) {
        stillRemaining.push(p);
        continue;
      }

      const opusParentId =
        p.parent_id && p.parent_id !== inboxProjectId
          ? projectIdMap.get(p.parent_id)
          : null;

      const { data, error } = await supabase
        .from('projects')
        .insert({
          owner_id: userId,
          parent_id: opusParentId,
          name: p.name,
          description: p.description || null,
          color: convertColor(p.color),
          sort_order: p.order,
          is_archived: p.is_archived,
        })
        .select('id')
        .single();

      if (error) {
        console.error(`  ✗ Failed to insert project "${p.name}":`, error.message);
        continue;
      }

      projectIdMap.set(p.id, data.id);
      insertedProjectIds.add(p.id);
      console.log(`  ✓ ${p.name}`);
    }

    remaining = stillRemaining;
    maxIterations--;
  }

  if (remaining.length > 0) {
    console.warn(`  ⚠ Could not insert ${remaining.length} projects (parent issues)`);
  }

  // -------------------------------------------------------------------------
  // 2. Import Sections
  // -------------------------------------------------------------------------
  console.log('\nImporting sections...');

  for (const s of sections) {
    if (s.project_id === inboxProjectId) {
      continue;
    }

    const opusProjectId = projectIdMap.get(s.project_id);
    if (!opusProjectId) {
      console.warn(`  ⚠ Skipping section "${s.name}" (project not imported)`);
      continue;
    }

    const { data, error } = await supabase
      .from('sections')
      .insert({
        project_id: opusProjectId,
        name: s.name,
        sort_order: s.order,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  ✗ Failed to insert section "${s.name}":`, error.message);
      continue;
    }

    sectionIdMap.set(s.id, data.id);
    console.log(`  ✓ ${s.name}`);
  }

  // -------------------------------------------------------------------------
  // 3. Import Tasks
  // -------------------------------------------------------------------------
  console.log('\nImporting tasks...');

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.parent_id === null && b.parent_id !== null) return -1;
    if (a.parent_id !== null && b.parent_id === null) return 1;
    return a.order - b.order;
  });

  let remainingTasks: TodoistTask[] = [...sortedTasks];
  const insertedTaskIds = new Set<string>();
  maxIterations = 10;

  while (remainingTasks.length > 0 && maxIterations > 0) {
    const stillRemaining: TodoistTask[] = [];

    for (const t of remainingTasks) {
      const canInsert =
        t.parent_id === null || insertedTaskIds.has(t.parent_id);

      if (!canInsert) {
        stillRemaining.push(t);
        continue;
      }

      const isInboxTask = t.project_id === inboxProjectId;
      const opusProjectId = isInboxTask ? null : projectIdMap.get(t.project_id);

      if (!isInboxTask && !opusProjectId) {
        console.warn(`  ⚠ Skipping task "${t.content}" (project not imported)`);
        continue;
      }

      const opusSectionId = t.section_id
        ? sectionIdMap.get(t.section_id) || null
        : null;

      const opusParentTaskId = t.parent_id
        ? taskIdMap.get(t.parent_id) || null
        : null;

      const { due_date, due_time, recurrence_rule, recurrence_base_date } =
        parseDue(t.due);

      // Extract deadline if present
      const deadline = t.deadline?.date || null;

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          owner_id: userId,
          project_id: opusProjectId,
          section_id: opusSectionId,
          parent_task_id: opusParentTaskId,
          title: t.content,
          description: t.description || null,
          status: t.is_completed ? 'done' : 'open',
          priority: convertPriority(t.priority),
          due_date,
          due_time,
          deadline,
          recurrence_rule,
          recurrence_base_date,
          sort_order: t.order,
        })
        .select('id')
        .single();

      if (error) {
        console.error(`  ✗ Failed to insert task "${t.content}":`, error.message);
        continue;
      }

      taskIdMap.set(t.id, data.id);
      insertedTaskIds.add(t.id);

      const prefix = isInboxTask ? '📥' : '✓';
      console.log(`  ${prefix} ${t.content.slice(0, 50)}${t.content.length > 50 ? '...' : ''}`);
    }

    remainingTasks = stillRemaining;
    maxIterations--;
  }

  if (remainingTasks.length > 0) {
    console.warn(`  ⚠ Could not insert ${remainingTasks.length} tasks (parent issues)`);
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('Import complete!');
  console.log(`  Projects: ${projectIdMap.size}`);
  console.log(`  Sections: ${sectionIdMap.size}`);
  console.log(`  Tasks:    ${taskIdMap.size}`);
  console.log('='.repeat(60));
}

async function main() {
  const token = process.argv[2];
  const email = process.argv[3];
  const password = process.argv[4];

  if (!token) {
    console.error('Usage: npx tsx scripts/import-todoist.ts <TODOIST_TOKEN> [EMAIL] [PASSWORD]');
    console.error('\nYou can find your Todoist API token in Todoist:');
    console.error('  Settings → Integrations → Developer → API token');
    console.error('\nIf you omit email/password, you\'ll be prompted to enter them.');
    process.exit(1);
  }

  const { supabaseUrl, supabaseKey } = loadEnv();

  try {
    let userId: string;
    let supabase: ReturnType<typeof createClient>;

    if (email && password) {
      // Use provided credentials
      supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        throw new Error(`Login failed: ${error?.message || 'Unknown error'}`);
      }
      console.log(`✓ Logged in as ${data.user.email}`);
      userId = data.user.id;
    } else {
      // Prompt for credentials
      const result = await loginAndGetUserId(supabaseUrl, supabaseKey);
      userId = result.userId;
      supabase = result.supabase;
    }

    await importToIntendWithAuth(token, supabase, userId);
  } catch (err) {
    console.error('\nImport failed:', err);
    process.exit(1);
  }
}

main();
