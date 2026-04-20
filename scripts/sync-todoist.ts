#!/usr/bin/env npx tsx
/**
 * Sync Todoist data to Intend (one-way: Todoist → Intend)
 *
 * Usage:
 *   npx tsx scripts/sync-todoist.ts <TODOIST_API_TOKEN> [EMAIL] [PASSWORD]
 *
 * What it does:
 *   1. Fetches all projects, sections, and tasks from Todoist
 *   2. Upserts into Intend (updates existing records, creates new ones)
 *   3. Uses todoist_id to track records - no duplicates!
 *
 * Safe to run repeatedly - designed for "sync button" use case.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

  if (due.datetime) {
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
// Sync Logic
// ---------------------------------------------------------------------------

interface SyncStats {
  projects: { created: number; updated: number; unchanged: number };
  sections: { created: number; updated: number; unchanged: number };
  tasks: { created: number; updated: number; unchanged: number };
}

async function syncToIntend(
  todoistToken: string,
  supabase: SupabaseClient,
  userId: string
): Promise<SyncStats> {
  const stats: SyncStats = {
    projects: { created: 0, updated: 0, unchanged: 0 },
    sections: { created: 0, updated: 0, unchanged: 0 },
    tasks: { created: 0, updated: 0, unchanged: 0 },
  };

  // Fetch all Todoist data
  const { projects, sections, tasks } = await fetchAllTodoistData(todoistToken);

  // Fetch existing Intend data with todoist_ids
  const [existingProjects, existingSections, existingTasks] = await Promise.all([
    supabase.from('projects').select('id, todoist_id').eq('owner_id', userId),
    supabase.from('sections').select('id, todoist_id, project_id'),
    supabase.from('tasks').select('id, todoist_id').eq('owner_id', userId),
  ]);

  // Build lookup maps: todoist_id → opus_id
  const projectMap = new Map<string, string>();
  for (const p of existingProjects.data || []) {
    if (p.todoist_id) projectMap.set(p.todoist_id, p.id);
  }

  const sectionMap = new Map<string, string>();
  for (const s of existingSections.data || []) {
    if (s.todoist_id) sectionMap.set(s.todoist_id, s.id);
  }

  const taskMap = new Map<string, string>();
  for (const t of existingTasks.data || []) {
    if (t.todoist_id) taskMap.set(t.todoist_id, t.id);
  }

  // Track inbox project
  let inboxProjectId: string | null = null;
  for (const p of projects) {
    if (p.is_inbox_project) {
      inboxProjectId = p.id;
      break;
    }
  }

  // -------------------------------------------------------------------------
  // 1. Sync Projects
  // -------------------------------------------------------------------------
  console.log('\nSyncing projects...');

  const sortedProjects = [...projects]
    .filter(p => !p.is_inbox_project)
    .sort((a, b) => a.order - b.order);

  // Process in order to handle parent dependencies
  let remaining = [...sortedProjects];
  let maxIterations = 10;
  const processedProjects = new Set<string>();

  while (remaining.length > 0 && maxIterations > 0) {
    const stillRemaining: TodoistProject[] = [];

    for (const p of remaining) {
      // Check if parent is processed (or no parent)
      const canProcess =
        p.parent_id === null ||
        p.parent_id === inboxProjectId ||
        processedProjects.has(p.parent_id);

      if (!canProcess) {
        stillRemaining.push(p);
        continue;
      }

      const opusParentId =
        p.parent_id && p.parent_id !== inboxProjectId
          ? projectMap.get(p.parent_id) || null
          : null;

      const existingIntendId = projectMap.get(p.id);
      const projectData = {
        owner_id: userId,
        parent_id: opusParentId,
        name: p.name,
        description: p.description || null,
        color: convertColor(p.color),
        sort_order: p.order,
        is_archived: p.is_archived,
        todoist_id: p.id,
      };

      if (existingIntendId) {
        // Update existing
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', existingIntendId);

        if (error) {
          console.error(`  ✗ Failed to update project "${p.name}":`, error.message);
        } else {
          stats.projects.updated++;
          console.log(`  ↻ ${p.name}`);
        }
      } else {
        // Create new
        const { data, error } = await supabase
          .from('projects')
          .insert(projectData)
          .select('id')
          .single();

        if (error) {
          console.error(`  ✗ Failed to create project "${p.name}":`, error.message);
        } else {
          projectMap.set(p.id, data.id);
          stats.projects.created++;
          console.log(`  + ${p.name}`);
        }
      }

      processedProjects.add(p.id);
    }

    remaining = stillRemaining;
    maxIterations--;
  }

  // -------------------------------------------------------------------------
  // 2. Sync Sections
  // -------------------------------------------------------------------------
  console.log('\nSyncing sections...');

  for (const s of sections) {
    if (s.project_id === inboxProjectId) continue;

    const opusProjectId = projectMap.get(s.project_id);
    if (!opusProjectId) {
      console.warn(`  ⚠ Skipping section "${s.name}" (project not synced)`);
      continue;
    }

    const existingIntendId = sectionMap.get(s.id);
    const sectionData = {
      project_id: opusProjectId,
      name: s.name,
      sort_order: s.order,
      todoist_id: s.id,
    };

    if (existingIntendId) {
      const { error } = await supabase
        .from('sections')
        .update(sectionData)
        .eq('id', existingIntendId);

      if (error) {
        console.error(`  ✗ Failed to update section "${s.name}":`, error.message);
      } else {
        stats.sections.updated++;
        console.log(`  ↻ ${s.name}`);
      }
    } else {
      const { data, error } = await supabase
        .from('sections')
        .insert(sectionData)
        .select('id')
        .single();

      if (error) {
        console.error(`  ✗ Failed to create section "${s.name}":`, error.message);
      } else {
        sectionMap.set(s.id, data.id);
        stats.sections.created++;
        console.log(`  + ${s.name}`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // 3. Sync Tasks
  // -------------------------------------------------------------------------
  console.log('\nSyncing tasks...');

  // Sort: parents first
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.parent_id === null && b.parent_id !== null) return -1;
    if (a.parent_id !== null && b.parent_id === null) return 1;
    return a.order - b.order;
  });

  let remainingTasks = [...sortedTasks];
  const processedTasks = new Set<string>();
  maxIterations = 10;

  while (remainingTasks.length > 0 && maxIterations > 0) {
    const stillRemaining: TodoistTask[] = [];

    for (const t of remainingTasks) {
      const canProcess = t.parent_id === null || processedTasks.has(t.parent_id);

      if (!canProcess) {
        stillRemaining.push(t);
        continue;
      }

      const isInboxTask = t.project_id === inboxProjectId;
      const opusProjectId = isInboxTask ? null : projectMap.get(t.project_id);

      if (!isInboxTask && !opusProjectId) {
        console.warn(`  ⚠ Skipping task "${t.content}" (project not synced)`);
        processedTasks.add(t.id);
        continue;
      }

      const opusSectionId = t.section_id ? sectionMap.get(t.section_id) || null : null;
      const opusParentTaskId = t.parent_id ? taskMap.get(t.parent_id) || null : null;
      const { due_date, due_time, recurrence_rule, recurrence_base_date } = parseDue(t.due);
      const deadline = t.deadline?.date || null;

      const existingIntendId = taskMap.get(t.id);
      const taskData = {
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
        todoist_id: t.id,
      };

      const prefix = isInboxTask ? '📥' : '';
      const titlePreview = t.content.slice(0, 40) + (t.content.length > 40 ? '...' : '');

      if (existingIntendId) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', existingIntendId);

        if (error) {
          console.error(`  ✗ Failed to update task "${t.content}":`, error.message);
        } else {
          stats.tasks.updated++;
          console.log(`  ↻ ${prefix}${titlePreview}`);
        }
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .insert(taskData)
          .select('id')
          .single();

        if (error) {
          console.error(`  ✗ Failed to create task "${t.content}":`, error.message);
        } else {
          taskMap.set(t.id, data.id);
          stats.tasks.created++;
          console.log(`  + ${prefix}${titlePreview}`);
        }
      }

      processedTasks.add(t.id);
    }

    remainingTasks = stillRemaining;
    maxIterations--;
  }

  return stats;
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
    console.error('Usage: npx tsx scripts/sync-todoist.ts <TODOIST_TOKEN> [EMAIL] [PASSWORD]');
    console.error('\nYou can find your Todoist API token in Todoist:');
    console.error('  Settings → Integrations → Developer → API token');
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

    const stats = await syncToIntend(token, supabase, userId);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Sync complete!');
    console.log(`  Projects: ${stats.projects.created} created, ${stats.projects.updated} updated`);
    console.log(`  Sections: ${stats.sections.created} created, ${stats.sections.updated} updated`);
    console.log(`  Tasks:    ${stats.tasks.created} created, ${stats.tasks.updated} updated`);
    console.log('='.repeat(60));
  } catch (err) {
    console.error('\nSync failed:', err);
    process.exit(1);
  }
}

main();
