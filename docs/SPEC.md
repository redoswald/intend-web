# Intend — Product Specification

## Vision

A Todoist-like task manager with first-class support for AI-assisted planning. Built for personal use but designed for multiple users and project sharing from day one. The core insight: tasks need *context* (not just titles) so an AI can meaningfully review, prioritize, and schedule them.

### Design Principles

1. **Multi-user from the start.** Every entity has an owner. Auth is baked into the data model, not bolted on later.
2. **Sharing is project-level.** You can share a project (and its tasks) with other users. You can't share individual tasks outside a project — that's what Inbox-to-project promotion is for.
3. **AI is personal.** AI features (daily plan, portfolio review) only see *your* tasks and projects, including shared ones. It never leaks another user's unshared data into your context.

---

## Architecture

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React + TypeScript | Component-based, Claude Code friendly |
| Styling | Tailwind CSS | Utility-first, fast iteration |
| Backend | Supabase | Postgres + Auth + Row Level Security |
| API | Supabase client + Edge Functions | Direct DB access from client, Edge Functions for AI |
| Build | Vite | Fast dev server, simple config |
| Hosting | Vercel | Serverless, easy deploys |
| AI (post-MVP) | Anthropic API | Claude for all AI features |

### Why Supabase changes the architecture

With Supabase, you don't need a separate Express backend for most operations. The Supabase client talks directly to Postgres, and **Row Level Security (RLS)** handles authorization at the database level. This means:

- No Express server for CRUD operations
- Auth is handled by Supabase Auth (email/password, magic links, OAuth)
- Authorization policies live in SQL, not in route middleware
- Edge Functions (serverless) handle AI features that need server-side API keys

### Project Structure

```
intend-web/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MainPanel.tsx
│   │   │   └── AppShell.tsx
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   └── AuthGuard.tsx
│   │   ├── tasks/
│   │   │   ├── TaskItem.tsx
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskDetail.tsx
│   │   │   └── TaskEditor.tsx
│   │   ├── projects/
│   │   │   ├── ProjectView.tsx
│   │   │   ├── ProjectDescription.tsx
│   │   │   ├── ProjectTree.tsx
│   │   │   └── ShareProjectDialog.tsx
│   │   └── views/
│   │       ├── InboxView.tsx
│   │       ├── TodayView.tsx
│   │       └── UpcomingView.tsx
│   ├── hooks/
│   │   ├── useTasks.ts
│   │   ├── useProjects.ts
│   │   └── useViews.ts
│   ├── lib/
│   │   └── supabase.ts       # Supabase client singleton
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── migrations/           # SQL schema + RLS policies
│   │   └── 001_initial.sql
│   └── functions/            # Edge Functions (AI features)
│       ├── daily-plan/
│       ├── project-review/
│       └── portfolio-review/
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Data Model

### Core Entities

Supabase Auth handles users and sessions automatically. The `auth.users` table exists; we reference it via `auth.uid()` in RLS policies.

#### Profiles (extends Supabase Auth)

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### Projects

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,              -- Markdown. The "Wikipedia-like" blurb.
    color TEXT DEFAULT '#808080',
    sort_order INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users see projects they own OR are shared with
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
    ON projects FOR SELECT
    USING (owner_id = auth.uid());

CREATE POLICY "Users can view shared projects"
    ON projects FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM project_shares
            WHERE project_id = projects.id
            AND shared_with_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own projects"
    ON projects FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own projects"
    ON projects FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "Users can update shared projects with edit+"
    ON projects FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM project_shares
            WHERE project_id = projects.id
            AND shared_with_user_id = auth.uid()
            AND permission IN ('edit', 'admin')
        )
    );

CREATE POLICY "Users can delete own projects"
    ON projects FOR DELETE
    USING (owner_id = auth.uid());
```

#### Project Sharing

```sql
CREATE TYPE share_permission AS ENUM ('view', 'edit', 'admin');

CREATE TABLE project_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission share_permission DEFAULT 'view',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, shared_with_user_id)
);

ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;

-- Only project owners and admins can see/manage shares
CREATE POLICY "Owners can manage shares"
    ON project_shares FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_shares.project_id
            AND projects.owner_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage shares"
    ON project_shares FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM project_shares ps
            WHERE ps.project_id = project_shares.project_id
            AND ps.shared_with_user_id = auth.uid()
            AND ps.permission = 'admin'
        )
    );
```

**Sharing model:**
- `view` — can see the project, its tasks, and descriptions. Cannot modify anything.
- `edit` — can add/complete/modify tasks and sections. Cannot delete the project or change sharing.
- `admin` — full control, including sharing with others. Useful if you want Zoe to be able to invite a friend to a trip project.

**Sharing rules:**
- Sharing a parent project does NOT automatically share subprojects. Each is shared independently. This prevents accidental exposure (e.g., sharing a "Trips" parent shouldn't share your "Career Strategy" sibling).
- Tasks inherit visibility from their project. If you can see the project, you can see all its tasks.
- Inbox tasks (no project) are never visible to other users.
- Sharing is by email invite: you type an email, if the account exists they get access immediately. If not, the share is pending until they sign up.

Projects are hierarchical. A project with `parent_id = NULL` is a top-level project. Subprojects reference their parent. This mirrors Todoist's `# Projects > # Subproject` pattern from the screenshot.

**From the screenshot, Aaron's structure looks like:**
- My Projects
  - 🧱 Making (parent)
    - Coding (section-like, but could be subproject)
    - CRM (subproject with 8 tasks)
    - Personal Website (subproject)
  - Work Projects
  - 2025H1 Career Strategy
  - Trip projects (Cosy Cabin, NYC, California, Dolomites)
- Areas
  - Work, Spirituality, Date List, Altruism, Fitness/Hiking, etc.

#### Sections

```sql
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

-- Sections inherit project visibility
CREATE POLICY "Users can view sections of accessible projects"
    ON sections FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = sections.project_id
            AND (
                projects.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_shares
                    WHERE project_shares.project_id = projects.id
                    AND project_shares.shared_with_user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can modify sections of editable projects"
    ON sections FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = sections.project_id
            AND (
                projects.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_shares
                    WHERE project_shares.project_id = projects.id
                    AND project_shares.shared_with_user_id = auth.uid()
                    AND project_shares.permission IN ('edit', 'admin')
                )
            )
        )
    );
```

Sections are visual dividers within a project (like "Coding" and "CRM" headers in the screenshot).

#### Tasks

```sql
CREATE TYPE task_status AS ENUM ('open', 'done', 'cancelled');

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,             -- Markdown. Rich context for AI review.
    status task_status DEFAULT 'open',
    priority INTEGER DEFAULT 0 CHECK(priority BETWEEN 0 AND 3),
                                  -- 0=none, 1=low, 2=medium, 3=high
    due_date DATE,
    due_time TIME,
    
    -- Recurrence
    recurrence_rule TEXT,         -- RRULE string, e.g. 'FREQ=WEEKLY;BYDAY=MO,TH'
    recurrence_base_date DATE,    -- The anchor date for recurrence calculation
    
    -- Threading/dependencies (key differentiator from Todoist)
    blocked_by UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    sort_order INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Inbox tasks: only visible to owner
CREATE POLICY "Users can access own inbox tasks"
    ON tasks FOR ALL
    USING (owner_id = auth.uid() AND project_id IS NULL);

-- Project tasks: visible if project is accessible
CREATE POLICY "Users can view tasks in accessible projects"
    ON tasks FOR SELECT
    USING (
        project_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = tasks.project_id
            AND (
                projects.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_shares
                    WHERE project_shares.project_id = projects.id
                    AND project_shares.shared_with_user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can modify tasks in editable projects"
    ON tasks FOR ALL
    USING (
        project_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = tasks.project_id
            AND (
                projects.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_shares
                    WHERE project_shares.project_id = projects.id
                    AND project_shares.shared_with_user_id = auth.uid()
                    AND project_shares.permission IN ('edit', 'admin')
                )
            )
        )
    );
```

**Key design decisions:**

1. **`description` is Markdown.** This is the critical difference from Todoist. Every task *can* have rich context: what it is, why it matters, what "done" looks like. This is what makes AI review possible.

2. **`blocked_by` creates threading.** A task can declare "I can't start until task X is done." This is simpler than a full DAG dependency graph but covers the primary use case: linear chains of work. If you need A → B → C, then C.blocked_by = B, B.blocked_by = A.

3. **`recurrence_rule` uses RRULE format** (from iCalendar RFC 5545). This is a well-specified standard that handles "every Monday and Thursday", "first of every month", "every 2 weeks", etc. Libraries exist to parse it.

4. **Tasks without a `project_id` live in the Inbox.**

#### Task Dependencies (many-to-many, for future use)

The `blocked_by` single-reference is MVP. If we need many-to-many later:

```sql
-- POST-MVP: Replace blocked_by column with this
CREATE TABLE task_dependencies (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, depends_on)
);
```

#### Labels (optional, post-MVP)

```sql
CREATE TABLE labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#808080',
    UNIQUE(owner_id, name)
);

CREATE TABLE task_labels (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, label_id)
);
```

---

## Views & UI

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  Sidebar (280px)  │  Main Panel                          │
│                   │                                      │
│  + Add task       │  [View Title]                        │
│                   │                                      │
│  Inbox       (3)  │  ┌─ Project Description ──────────┐  │
│  Today      (12)  │  │ Short markdown blurb about     │  │
│  Upcoming         │  │ what this project is/produces.  │  │
│                   │  └────────────────────────────────┘  │
│  ─────────────    │                                      │
│  My Projects      │  Section: Coding                     │
│    ▸ Making       │  ○ Copy terminal setup               │
│      CRM     (8)  │  ○ Secret Hitler Harness             │
│      Website (3)  │                                      │
│    Work Proj (3)  │  Section: CRM                        │
│    Career   (61)  │  ○ Create dev backlog                │
│    Trips...       │    ○ Subtask here                    │
│                   │    ○ Another subtask                 │
│  Areas            │  ○ Add streaming/suspense            │
│    Work      (1)  │    ⊳ blocked by: "Create dev..."    │
│    Fitness   (3)  │                                      │
│    ...            │                                      │
└──────────────────────────────────────────────────────────┘
```

### Sidebar

- **Fixed-width left panel** (~280px), collapsible
- **Quick-add button** at top — opens inline task creator
- **Smart views:** Inbox, Today, Upcoming (with task counts as badges)
- **Project tree:** Expandable/collapsible. Shows project name + open task count. Drag to reorder (post-MVP).
- Active view/project is highlighted

### Smart Views

**Inbox:** Tasks where `project_id IS NULL`. These are uncategorized captures. The goal is to process these into projects regularly (or complete them).

**Today:** Tasks where `due_date = today` OR `due_date < today` (overdue). Sorted by priority desc, then due_time, then sort_order. Overdue tasks are visually distinct (red date badge).

**Upcoming:** Tasks where `due_date > today`, grouped by date. Shows next 14 days by default with a "load more" option.

### Project View

When a project is selected from the sidebar:

1. **Project description** at top — rendered Markdown, click-to-edit. This is the "Wikipedia blurb" that gives AI context.
2. **Sections** as collapsible headers
3. **Tasks** within sections, with:
   - Checkbox (circle) on the left
   - Task title (click to expand/edit)
   - Subtasks indented below parent
   - Dependency indicator: if `blocked_by` is set, show a small "⊳ blocked by: [task title]" in muted text
   - Due date badge on the right (color-coded: red=overdue, orange=today, gray=future)
4. **"+ Add task"** at the bottom of each section

### Task Detail / Editor

Clicking a task title opens an inline expanded view (not a modal — keep context visible):

- Title (editable, large text)
- Description (Markdown editor, medium text area)
- Project selector (dropdown)
- Section selector (dropdown, filtered to selected project)
- Due date picker
- Recurrence rule builder (simple UI: "Every [n] [day/week/month] on [days]")
- Priority selector (none / low / medium / high, with color dots)
- "Blocked by" selector (searchable dropdown of other open tasks)
- Subtask list (inline, can add subtasks here)

---

## Data Access Patterns

With Supabase, there's no REST API to maintain. The frontend uses the Supabase client directly, and RLS policies handle authorization. Here are the key access patterns:

### Auth (Supabase Auth)

```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: { data: { display_name: 'Aaron' } }
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Sign out
await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

### Tasks

```typescript
// List tasks in a project
const { data: tasks } = await supabase
  .from('tasks')
  .select('*, subtasks:tasks(*)') // Self-join for subtasks
  .eq('project_id', projectId)
  .is('parent_task_id', null)     // Top-level only
  .order('sort_order');

// Inbox (tasks with no project)
const { data: inbox } = await supabase
  .from('tasks')
  .select('*')
  .is('project_id', null)
  .eq('owner_id', userId);

// Today view
const { data: today } = await supabase
  .from('tasks')
  .select('*, project:projects(name, color)')
  .lte('due_date', new Date().toISOString().split('T')[0])
  .eq('status', 'open');

// Create task
const { data: task } = await supabase
  .from('tasks')
  .insert({ title, project_id, owner_id: userId })
  .select()
  .single();

// Complete task (for recurring, handle in app logic)
const { data } = await supabase
  .from('tasks')
  .update({ status: 'done', completed_at: new Date().toISOString() })
  .eq('id', taskId);
```

### Projects

```typescript
// List all accessible projects (owned + shared)
const { data: projects } = await supabase
  .from('projects')
  .select('*')
  .eq('is_archived', false)
  .order('sort_order');

// Get project with sections and tasks
const { data: project } = await supabase
  .from('projects')
  .select(`
    *,
    sections(*, tasks(*)),
    tasks(*)
  `)
  .eq('id', projectId)
  .single();
```

### Sharing

```typescript
// Share a project
const { data } = await supabase
  .from('project_shares')
  .insert({
    project_id: projectId,
    shared_with_user_id: targetUserId, // Look up by email first
    permission: 'edit'
  });

// List shares for a project
const { data: shares } = await supabase
  .from('project_shares')
  .select('*, user:profiles(*)')
  .eq('project_id', projectId);
```

**Note:** Authorization is handled by RLS policies. If a user doesn't have access, the query simply returns no rows (not an error). This is by design — it prevents leaking information about what exists.

### Edge Functions (AI Features)

AI features require server-side code to keep the Anthropic API key secret. These live in `supabase/functions/`:

```typescript
// supabase/functions/daily-plan/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );
  
  // Fetch user's tasks for today (RLS applies)
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .lte('due_date', new Date().toISOString().split('T')[0])
    .eq('status', 'open');
  
  // Call Claude API
  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: `Plan these tasks: ${JSON.stringify(tasks)}` }]
  });
  
  return new Response(JSON.stringify({ plan: message.content }));
});
```

**Edge Function endpoints:**

| Function | Path | Description |
|----------|------|-------------|
| daily-plan | `/functions/v1/daily-plan` | Generate today's recommended task order |
| project-review | `/functions/v1/project-review` | Within-project task analysis |
| portfolio-review | `/functions/v1/portfolio-review` | Cross-project review and prioritization |

Called from the frontend via `supabase.functions.invoke('daily-plan')`.

---

## Recurrence Logic

When a recurring task is completed:

1. Mark current instance as `status = 'done'`, `completed_at = now()`
2. Calculate next occurrence from `recurrence_rule` + `recurrence_base_date`
3. Create a new task with identical properties but:
   - New `id`
   - `due_date` = next occurrence
   - `status = 'open'`
   - `completed_at = NULL`

**Example RRULE values:**

| Human description | RRULE |
|-------------------|-------|
| Every Monday and Thursday | `FREQ=WEEKLY;BYDAY=MO,TH` |
| Every week on Saturday | `FREQ=WEEKLY;BYDAY=SA` |
| First of every month | `FREQ=MONTHLY;BYMONTHDAY=1` |
| Every 2 weeks | `FREQ=WEEKLY;INTERVAL=2` |
| Every day | `FREQ=DAILY` |

Use the `rrule` npm package for parsing and next-occurrence calculation.

---

## Dependency / Threading Behavior

When a task has `blocked_by` set:

- **Visual:** Show a dependency indicator on the blocked task (muted link to the blocking task)
- **Today view:** Blocked tasks still appear if due today, but are visually dimmed with a "blocked" badge
- **AI scheduling:** The AI daily planner should respect dependency order — never suggest a blocked task before its blocker
- **Completion cascade:** When a blocking task is completed, any tasks it was blocking become "unblocked" — no auto-notification in MVP, but the visual indicator updates

---

## AI Features (Post-MVP)

All AI features use the Anthropic API. The key insight: because tasks have descriptions (not just titles), the AI has enough context to reason about them.

### Level 1: Daily Planner

**Trigger:** User clicks "Plan my day" or it auto-generates on first open each day.

**Input to AI:**
- All tasks due today or overdue
- Tasks due this week (for context)
- Dependency graph for those tasks
- Current day/time
- Any recurring tasks for today

**AI prompt pattern:**
```
Here are the user's tasks for today. Consider:
- Dependencies (blocked tasks can't start until blockers are done)
- Priority levels
- Time sensitivity (deadlines)
- Task size (inferred from description complexity)
- Balance of task types (don't cluster all hard tasks together)

Produce an ordered list with brief reasoning.
```

**Output:** An ordered task list with optional time blocks and a one-line rationale per task.

### Level 2: Within-Project Review

**Trigger:** User clicks "Review this project" from project view.

**Input to AI:**
- Project name and description
- All tasks in the project (with descriptions, statuses, dates)
- Dependency graph within the project

**AI does:**
- Flags tasks missing descriptions or dates
- Suggests missing tasks (gaps in the plan)
- Identifies dependency chains that seem wrong
- Recommends priority adjustments
- Estimates if the project timeline is realistic

### Level 3: Portfolio Review

**Trigger:** User clicks "Review all projects" (weekly ritual).

**Input to AI:**
- All active (non-archived) projects with descriptions
- Task counts and upcoming deadlines per project
- Recently completed tasks (last 7 days)
- Stale projects (no task completions in 14+ days)

**AI does:**
- Identifies overcommitment (too many active projects)
- Flags stale projects and asks "still relevant?"
- Suggests which projects to prioritize this week
- Looks for cross-project conflicts (two deadlines same week)
- Recommends "park" or "archive" for zombie projects

---

## MVP Scope

### Phase 1: Core Task Management
- [ ] Supabase project setup + schema migration
- [ ] Auth UI (signup, login — using Supabase Auth)
- [ ] Project CRUD with hierarchy
- [ ] Section CRUD
- [ ] Task CRUD with subtasks
- [ ] Inbox / Today / Upcoming views
- [ ] Sidebar with project tree
- [ ] Task completion (non-recurring)

### Phase 2: Rich Features
- [ ] Task descriptions (Markdown)
- [ ] Project descriptions (Markdown)
- [ ] Recurrence rules + completion-creates-next
- [ ] Task dependencies (`blocked_by`)
- [ ] Due date picker + priority selector
- [ ] Dependency visualization
- [ ] Project sharing (invite by email, permission levels)
- [ ] Shared project indicators in sidebar

### Phase 3: AI Integration
- [ ] Daily planner
- [ ] Within-project review
- [ ] Portfolio review
- [ ] AI-suggested tasks

### Phase 4: Polish
- [ ] Keyboard shortcuts (q=quick add, etc.)
- [ ] Drag-and-drop reordering
- [ ] Search across all tasks
- [ ] Import from Todoist (API or CSV)
- [ ] Pending share invites (for emails not yet signed up)
- [ ] Dark mode

---

## Design Notes

### Visual Style

- Clean, minimal, warm — similar to Todoist's aesthetic
- White/light background, subtle borders
- Left sidebar: light gray background
- Task checkboxes: circles (not squares), color = priority
- Typography: System font stack, 14px base
- Accent color: Warm orange (like Todoist) or pick your own

### Interaction Patterns

- **Inline editing:** Click a task title to edit in place. No modals for basic edits.
- **Quick add:** Global shortcut (Cmd+K or similar) to add a task from anywhere
- **Completion animation:** Satisfying check animation, brief delay before task disappears (so you can undo)
- **Keyboard-first:** Arrow keys to navigate tasks, Enter to edit, Escape to close

---

## Running Locally

```bash
# Setup (from project root)
npm install

# Link to your Supabase project
npx supabase login
npx supabase link --project-ref <your-project-ref>

# Push database schema
npx supabase db push

# Development
npm run dev          # Starts Vite dev server

# Deploy Edge Functions (for AI features)
npx supabase functions deploy daily-plan
npx supabase functions deploy project-review
npx supabase functions deploy portfolio-review
```

Environment variables (`.env`):
```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Edge Function secrets (set via Supabase dashboard or CLI):
```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-...
```

## Deployment to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
```

That's it. No server to manage — Supabase handles the database and auth, Vercel handles the static frontend, Edge Functions handle AI.
