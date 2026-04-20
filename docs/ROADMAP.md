# Intend Roadmap

## Completed

- [x] Project scaffolding (Vite + React + TypeScript + Tailwind)
- [x] Supabase setup with RLS policies
- [x] Authentication (signup, login, logout)
- [x] Projects CRUD with hierarchy (subprojects)
- [x] Sections within projects (table of contents style)
- [x] Tasks CRUD (create, complete, edit)
- [x] Project descriptions with Markdown rendering
- [x] Editable project names
- [x] Smart views: Inbox, Today, Upcoming
- [x] Sidebar with project tree navigation
- [x] Task descriptions with Markdown rendering and preview
- [x] Drag-and-drop tasks to projects/inbox in sidebar
- [x] Completed tasks view with history grouped by date
- [x] Editable completion dates (backdate completions)
- [x] Deadlines (hard deadline separate from scheduled due date)
- [x] Import from Todoist (projects, sections, tasks, completed tasks, deadlines)
- [x] Recurrence rule converter (Todoist natural language → RRULE)
- [x] Independent scrolling for sidebar and main content
- [x] Supabase CLI linked for migrations
- [x] Deploy to Vercel (tasks.doneintentionally.com)
- [x] Maestro AI panel — slide-in drawer with suggested prompts, free-form input, markdown responses
- [x] ⌘K command palette — search projects and views
- [x] aaronOS design system foundation (CSS vars, fonts, shadcn scaffold)
- [x] Sidebar three-zone layout with drag-to-resize and localStorage persistence
- [x] App switcher (Zone 1) and account menu dropdown (Zone 3)
- [x] Lucide icon migration (sidebar, AppShell, CommandPalette)
- [x] Toast notifications with undo for task and project actions
- [x] ⌘K enhanced — task search, project search, actions (Maestro, settings, new project)
- [x] Google avatar in sidebar + display name editing
- [x] Project drag-to-reorder with visual drop indicators
- [x] Project color picker via context menu
- [x] Project archive/unarchive + Archive view
- [x] Route-based settings page (`/settings`) — Profile, Maestro AI, Security, Apps, Data

---

## Next Up

### Tier 1 — Daily-Use Friction

- [x] ~~**Toast/undo system**~~ — Done. Global toast provider with undo on destructive actions
- [x] ~~**Quick-add from any view**~~ — Done. "+ Add task" on Today, Upcoming, and project pages. Context-aware: pre-fills current project and today's date. Sidebar "Add task" button is project-aware
- [x] ~~**Real settings page**~~ — Done. Route-based `/settings` with Profile, Maestro AI, Security, Apps, Data cards

### Tier 2 — Polish & Trust

- [ ] **Empty states** — Friendly zero-states for Inbox, Today, Upcoming, Completed, empty projects, and Maestro without API key
- [ ] **Loading skeletons** — Skeleton placeholders for task lists, project tree, Today view while data fetches
- [ ] **Save indicators** — Auto-save with "Saved"/"Saving..." feedback for project descriptions and task notes. Silent loss of edits is unacceptable
- [ ] **Task delete undo** — Trash icon exists but needs undo toast. Soft delete (`deleted_at` column) so nothing is truly gone
- [ ] **Task completion animation** — Satisfying check animation, brief delay before task disappears from active lists

### Tier 3 — Power User

- [ ] Keyboard shortcuts beyond ⌘K — `j`/`k` navigation, `q` for quick-add, `c` to complete, `e` to edit, `?` for help overlay
- [ ] Filter tasks within a view — by priority, project, date range
- [ ] Sort tasks — by due date, priority, creation date
- [ ] Search across all tasks (extend ⌘K or dedicated search view)
- [ ] Labels/tags (schema exists, needs UI)
- [ ] Bulk task operations — multi-select + bulk complete, delete, reschedule, move

### Tier 4 — Task Enhancements

- [ ] Due time display (data imported, needs UI)
- [ ] `blocked_by` dependencies — visual indicator, prevent completing blocked tasks
- [ ] Subtasks rendering (data imported, needs UI)
- [x] ~~Recurring tasks completion logic (creates next instance)~~ — Done. RecurrenceBuilder UI, auto-spawns next occurrence on completion, recurrence indicator on tasks
- [ ] Due date quick-set buttons — "Today," "Tomorrow," "Next week" instead of raw date picker
- [ ] Natural language date parsing ("tomorrow", "next monday")

### Tier 5 — Project Features

- [x] ~~Archive/unarchive projects~~ — Done. Context menu + Archive view + undo toast
- [ ] Project progress indicator — "12 of 30 tasks complete" or progress bar
- [x] ~~Drag-and-drop reordering (projects)~~ — Done. Sidebar project reorder with drop indicators. Sections/tasks still TODO
- [ ] Project sharing (already in DB schema, needs UI)
- [ ] Project templates for recurring workflows

### Tier 6 — Cross-App & Infrastructure

- [x] ~~Unified account settings shared with Tend~~ — Done. /settings page with shared Supabase profile
- [x] ~~App switcher dropdown~~ — Done. Wired up in sidebar Zone 1 + Apps card on settings
- [ ] Supabase Edge Functions for secure AI proxy (key never in browser)
- [ ] Real-time sync (Supabase subscriptions)
- [ ] Data export (JSON/CSV)
- [ ] Dark mode

---

## Known Issues

- MainPanel header doesn't update when project name is edited inline (need refresh)
- No error boundaries for graceful failure handling
- Maestro context awareness — should scope to current project/view when opened

---

## Tech Debt

- Add proper loading states to all data fetches (see: loading skeletons in Tier 2)
- Optimistic updates for task create/complete/delete
- Proper form validation
- Touch target audit — all interactive elements need ≥44px on mobile

---

## Scripts

Located in `/scripts/`:

- `import-todoist.ts` - Import projects, sections, and open tasks from Todoist
- `import-todoist-completed.ts` - Import completed task history from Todoist
- `update-deadlines.ts` - Sync deadlines from Todoist to existing tasks
- `query-completed.ts` - Query completed tasks (for debugging)
