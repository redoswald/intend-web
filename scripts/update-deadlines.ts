#!/usr/bin/env npx tsx
/**
 * Update existing Intend tasks with deadlines from Todoist
 *
 * Usage:
 *   npx tsx scripts/update-deadlines.ts <TODOIST_TOKEN> <EMAIL> <PASSWORD>
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv() {
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

  return { supabaseUrl, supabaseKey };
}

interface TodoistTask {
  id: string;
  content: string;
  deadline: { date: string } | null;
}

async function main() {
  const token = process.argv[2];
  const email = process.argv[3];
  const password = process.argv[4];

  if (!token || !email || !password) {
    console.error('Usage: npx tsx scripts/update-deadlines.ts <TODOIST_TOKEN> <EMAIL> <PASSWORD>');
    process.exit(1);
  }

  const { supabaseUrl, supabaseKey } = loadEnv();
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Login
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError || !authData.user) {
    console.error('Login failed:', authError?.message);
    process.exit(1);
  }
  console.log(`✓ Logged in as ${authData.user.email}`);

  // Fetch Todoist tasks
  console.log('\nFetching tasks from Todoist...');
  const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const todoistTasks: TodoistTask[] = await res.json();

  // Filter to only tasks with deadlines
  const tasksWithDeadlines = todoistTasks.filter(t => t.deadline !== null);
  console.log(`  Found ${tasksWithDeadlines.length} tasks with deadlines`);

  if (tasksWithDeadlines.length === 0) {
    console.log('\nNo tasks with deadlines to update.');
    return;
  }

  // Fetch all open Intend tasks
  console.log('\nFetching Intend tasks...');
  const { data: opusTasks, error: opusError } = await supabase
    .from('tasks')
    .select('id, title, deadline')
    .eq('status', 'open');

  if (opusError) {
    console.error('Failed to fetch Intend tasks:', opusError.message);
    process.exit(1);
  }

  // Create a map of title -> Intend task for matching
  const opusTaskMap = new Map<string, { id: string; deadline: string | null }>();
  for (const t of opusTasks || []) {
    // Use lowercase for matching
    opusTaskMap.set(t.title.toLowerCase(), { id: t.id, deadline: t.deadline });
  }

  // Update matching tasks
  console.log('\nUpdating deadlines...');
  let updated = 0;
  let notFound = 0;
  let alreadySet = 0;

  for (const t of tasksWithDeadlines) {
    const opusTask = opusTaskMap.get(t.content.toLowerCase());

    if (!opusTask) {
      notFound++;
      continue;
    }

    if (opusTask.deadline === t.deadline!.date) {
      alreadySet++;
      continue;
    }

    const { error } = await supabase
      .from('tasks')
      .update({ deadline: t.deadline!.date })
      .eq('id', opusTask.id);

    if (error) {
      console.error(`  ✗ Failed to update "${t.content}": ${error.message}`);
      continue;
    }

    console.log(`  ✓ ${t.content} → ${t.deadline!.date}`);
    updated++;
  }

  console.log('\n' + '='.repeat(60));
  console.log('Deadline update complete!');
  console.log(`  Updated: ${updated}`);
  console.log(`  Already set: ${alreadySet}`);
  console.log(`  Not found in Intend: ${notFound}`);
  console.log('='.repeat(60));
}

main();
