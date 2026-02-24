# Opus — Structured QoL Audit

## What We're Working With

**Current state (from screenshots + past conversations):**
- Sidebar with Zone 1 (Opus logo), Zone 2 (nav + project tree), Zone 3 (avatar + settings gear)
- Navigation: Inbox, Today (with count badge), Upcoming, Completed, Maestro
- Project hierarchy with sections, sub-projects, and emoji support (🎨 Making)
- Task creation inline from Inbox — title, description (markdown), project assignment, scheduled date, deadline, priority (color dots)
- Project pages with wiki-like purpose/description at top, sections, and task list below
- Maestro AI panel slides in from right — portfolio review, daily planning, overdue check
- Settings is a modal with just the Anthropic API key
- Shared Supabase auth with All Friends
- "Add task" in sidebar navigates to Inbox with inline creation form

---

## 1. ACCOUNT & SETTINGS

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Profile/account page | ❌ | High | Shared with All Friends — name, email, avatar |
| Change password | ❌ | High | Basic auth hygiene |
| Delete account | ❌ | Medium | Data ownership |
| Settings page (real) | ❌ | High | Current "settings" is just an API key modal. Needs to become a real page with sections |
| API key management | ✅ | — | Exists, works. Should move into a proper settings page under an "Integrations" or "AI" section |
| Notification preferences | ❌ | Low | Less urgent than All Friends since Opus doesn't have cadence reminders |
| Theme/appearance | ❌ | Low | Deferred to v2 with dark mode |
| Data export | ❌ | Medium | Export tasks/projects as JSON or CSV |
| Data import (Todoist) | ❌ | Medium | You use Todoist — migration path matters. Todoist has CSV and API export |

---

## 2. DESTRUCTIVE ACTION SAFETY

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Delete confirmation for tasks | ❓ Partial | High | I see a trash icon on task hover (project view), but no confirmation modal visible |
| Delete confirmation for projects | ❓ Unknown | High | Deleting a project with 20 tasks should be scary — requires modal + typing project name |
| Undo after task delete | ❌ | High | Toast with "Undo" (5-second window). Critical for accidental clicks |
| Undo after task complete | ❌ | Medium | Checking off the wrong task should be reversible. Brief delay or undo toast |
| Archive vs. delete for projects | ❌ | Medium | "I finished this project" ≠ "erase it." Completed projects should be archivable and browsable |
| Soft delete in database | ❓ Unknown | High | `deleted_at` column so nothing is truly gone |
| Section delete safety | ❓ Unknown | Medium | Deleting a section — do its tasks get orphaned, moved, or deleted? |

---

## 3. EMPTY & EDGE STATES

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Empty inbox | ❓ Unknown | High | What does a new user see? Should be "Nothing here — add your first task" with a friendly prompt |
| Empty Today | ❓ Unknown | Medium | "Nothing due today" is good — but could celebrate: "You're all caught up!" |
| Empty project (no tasks) | ❓ Unknown | Medium | New project created → show "Add your first task" affordance |
| Empty Completed view | ❓ Unknown | Low | "Nothing completed yet — get to work!" (playful) |
| Empty Upcoming | ❓ Unknown | Low | "No upcoming deadlines" |
| Empty Maestro (no API key) | ❓ Unknown | Medium | What happens if you open Maestro without an API key? Should guide to settings |
| Maestro error states | ❓ Unknown | Medium | API timeout, rate limit, bad key — all need graceful handling |
| Error states (network/auth) | ❓ Unknown | High | Supabase down, session expired, API errors |

---

## 4. FEEDBACK & CONFIRMATION

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Toast on task create | ❓ Unknown | High | "Task created" after adding from the inline form |
| Toast on task complete | ❓ Unknown | Medium | Satisfying feedback — checkmark animation or toast |
| Toast on task delete | ❌ | High | Required for undo pattern |
| Toast on project create | ❓ Unknown | Medium | "Project created" |
| Loading states | ❓ Unknown | High | Skeleton for task list, project tree, Today view |
| Optimistic updates | ❓ Unknown | Medium | Checking off a task should feel instant |
| Save indicator for descriptions | ❓ Unknown | High | Wiki-like project descriptions and task notes — auto-save with "Saved" / "Saving..." indicator? Or explicit save? Silent loss of edits is the worst |
| Maestro loading state | ❓ Unknown | Medium | AI responses take time — needs a typing indicator or progress state |

---

## 5. TASK CREATION & EDITING

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Inline task creation | ✅ | — | Works from Inbox. Title, description, project, dates, priority |
| Quick-add from any view | ❓ Unknown | High | "Add task" in sidebar goes to Inbox — but can you add a task while viewing Today or a project without leaving? |
| Task editing | ✅ | — | Same UI as creation, appears inline |
| Markdown in descriptions | ✅ | — | Placeholder says "Markdown supported" |
| Markdown preview | ❓ Unknown | Medium | Can you see rendered markdown, or is it always raw? |
| Subtasks | ❓ Unknown | Medium | Spec included subtasks — are they implemented? |
| Task dependencies (blocked_by) | ❓ Unknown | Medium | Spec included this — is it visible in the UI? |
| Recurrence rules | ❓ Unknown | Medium | "Everyday Do Waking Up meditation" in Today view suggests recurrence exists |
| Due date quick-set | ❌ | Medium | "Today," "Tomorrow," "Next week" buttons instead of raw date picker |
| Priority labels | ❓ Partial | Low | I see colored dots (gray, blue, yellow, pink) but no text labels. Are these discoverable? |
| Tags on tasks | ❌ | Low | Project assignment exists, but freeform tags could help |
| Task reordering (drag) | ❓ Unknown | Medium | Can you reorder tasks within a project or section? |

---

## 6. PROJECT MANAGEMENT

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Project creation | ✅ | — | Via "+" button next to PROJECTS |
| Project description (wiki) | ✅ | — | Nice — editable purpose/description at top of project |
| Sections within projects | ✅ | — | "Add section" visible on project page |
| Sub-projects | ✅ | — | Hierarchy visible in sidebar (Making → Coding, 3D Printing, etc.) |
| Project color/emoji | ✅ | — | Emoji on "Making" (🎨), dot colors on projects |
| Project archive | ❌ | Medium | Complete a project without deleting it |
| Project progress indicator | ❌ | Medium | "12 of 30 tasks complete" or a progress bar |
| Project due date / target date | ❓ Unknown | Low | Spec included this — is it implemented? |
| Move tasks between projects | ❓ Unknown | Medium | Drag or reassign from task edit |
| Project templates | ❌ | Low | "Create project from template" for recurring workflows |

---

## 7. VIEWS & NAVIGATION

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Inbox view | ✅ | — | Uncategorized tasks |
| Today view | ✅ | — | With "Overdue" section, date badges |
| Upcoming view | ✅ | — | Exists in nav |
| Completed view | ✅ | — | Exists in nav |
| ⌘K / search | ❌ | High | All Friends has ⌘K. Opus has a Search item in sidebar (from earlier screenshot) but latest screenshots don't show it — was it removed? |
| Filter tasks within a view | ❌ | Medium | By priority, by project, by date range |
| Sort tasks | ❓ Unknown | Medium | By due date, by priority, by creation date |
| Keyboard navigation | ❓ Unknown | Medium | j/k through task lists, Enter to edit, Escape to close |
| Quick-switch between projects | ❓ Unknown | Medium | Beyond clicking sidebar — ⌘K should search projects too |

---

## 8. MAESTRO AI

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Slide-in panel | ✅ | — | Right side, over content. Good pattern |
| Suggested prompts | ✅ | — | "Do a portfolio review," "Help me plan my day," "What's overdue?" |
| Free-form input | ✅ | — | Text input at bottom |
| Response display | ❓ Unknown | Medium | How do responses render? Markdown? Can Maestro create/modify tasks directly? |
| Context awareness | ❓ Unknown | High | Does Maestro know which project you're viewing? Can it scope advice to current context? |
| Action execution | ❓ Unknown | High | Can Maestro actually create tasks, reschedule, reprioritize — or just advise? |
| Conversation history | ❓ Unknown | Low | Does Maestro remember previous exchanges in the session? |
| Close/minimize | ✅ | — | X button visible |
| Keyboard shortcut to open | ❓ Unknown | Medium | Should be possible from anywhere |
| Error handling (bad API key) | ❓ Unknown | Medium | Graceful error if key is invalid/expired |
| Rate limit handling | ❓ Unknown | Medium | What happens if you hit Anthropic's rate limits? |

---

## 9. KEYBOARD & POWER USER

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| ⌘K command palette | ❌ | High | The single most impactful power-user feature. Search tasks, projects, switch views, trigger Maestro |
| Keyboard task navigation | ❓ Unknown | Medium | Arrow keys or j/k through task lists |
| Quick-add shortcut | ❓ Unknown | Medium | `q` or `n` to open task creation from anywhere |
| Complete task shortcut | ❓ Unknown | Medium | `c` or `x` on focused task |
| Maestro shortcut | ❓ Unknown | Medium | `m` or ⌘+M to open Maestro |
| Edit shortcut | ❓ Unknown | Medium | `e` or Enter on focused task |
| Escape to close | ❓ Unknown | Medium | Close modals, Maestro panel, cancel editing |
| Shortcut help overlay | ❌ | Low | `?` to show all shortcuts |

---

## 10. MOBILE RESPONSIVENESS

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Responsive layout | ❓ Unknown | High | Sidebar needs to collapse per design system spec |
| Touch targets | ❓ Unknown | High | Task checkboxes, priority dots, trash icons — all need ≥44px |
| Task creation on mobile | ❓ Unknown | High | The inline creation form needs to work well on small screens |
| Maestro on mobile | ❓ Unknown | Medium | Full-screen panel instead of side slide-in? |
| Project tree on mobile | ❓ Unknown | Medium | Deep hierarchy in sidebar — how does this render on small screens? |
| Swipe gestures | ❌ | Low | Swipe to complete, swipe to delete on task rows |

---

## 11. TASK LIST UX POLISH

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Task completion animation | ❓ Unknown | Medium | Satisfying check animation, brief delay before task disappears |
| Overdue visual treatment | ✅ | — | "Overdue" section header in red, dates in red. Clear |
| Task description preview | ✅ | — | Truncated description visible below task title. Good |
| Project badge on tasks | ✅ | — | Colored dot + project name under task. Good |
| Hover actions | ✅ Partial | — | Trash icon on hover visible. Are there others (edit, reschedule, move)? |
| Bulk task operations | ❌ | Medium | Multi-select + bulk complete, delete, reschedule, move to project |
| Task count badges | ✅ | — | "Today 12", "Inbox 1" in sidebar. Good |
| Drag to reorder | ❓ Unknown | Medium | Within a project or section |
| Drag to reschedule | ❌ | Low | Drag task to a different date (requires calendar view in Opus) |

---

## 12. DATA INTEGRITY & TRUST

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| API key stored securely | ✅ Partial | High | Modal says "stored securely in database" — but it's in Supabase, sent from browser. Consider server-side proxy so the key never lives in the client |
| Offline resilience | ❓ Unknown | Low | What happens if you lose connection mid-edit? |
| Auto-save for descriptions | ❓ Unknown | High | Losing a long project description edit would be painful |
| Conflict resolution | ❓ Unknown | Low | If Zoë and you edit the same shared project simultaneously |
| Backup/export | ❌ | Medium | JSON export of all tasks and projects |

---

## 13. LANDING PAGE & PUBLIC PRESENCE

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Landing page | ✅ | — | Exists, looks good |
| App switcher to All Friends | ❌ | High | Shared nav element per design system |
| "Is this free?" | ❌ | Medium | Pricing clarity, even if it's free |
| Privacy policy | ❌ | Medium | Especially since it stores an API key |
| "Built by Aaron" / about | ❌ | Low | Personal touch |
| BYOK explainer | ❌ | Medium | "Bring Your Own Key" — explain that Maestro uses the user's own Anthropic API key, not a shared one |

---

## 14. CROSS-APP (same as All Friends audit)

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Unified account settings | ❌ | High | Shared with All Friends |
| App switcher in sidebar | ❌ | High | Zone 1 dropdown |
| Shared avatar/display name | ❌ | Medium | Set once, appears everywhere |
| Consistent auth handling | ❓ Unknown | Medium | Session expiry, redirect behavior |
| All Friends → Opus integration | ❌ | Low-Medium | "Contact is due" → creates a task in Opus (future) |

---

## Summary: Top 10 Priorities

1. **⌘K command palette** — Opus is a power-user tool. This is the #1 missing feature for daily use. Search tasks, projects, switch views, open Maestro
2. **Toast/undo system** — Every create, complete, and delete needs feedback. Destructive actions need undo
3. **Delete confirmations** — Especially for projects with tasks. Task delete needs undo toast at minimum
4. **Real settings page** — The API key modal needs to become a proper settings section. Account management, AI config, and eventually appearance all live here
5. **App switcher** — Shared nav element (same priority as All Friends)
6. **Empty states** — New user experience for Inbox, Today, projects
7. **Save indicators for descriptions** — Project wiki and task descriptions need auto-save feedback. Losing edits silently would be brutal
8. **Loading skeletons** — Task lists, project trees, Today view
9. **Quick-add from any view** — Creating a task shouldn't require navigating away from Today or a project view
10. **Mobile responsiveness** — Sidebar collapse, touch targets, responsive task creation

---

## Opus-Specific Design Notes

**The "Add task" flow needs rethinking.** Currently it navigates to Inbox to show the creation form. This means if you're looking at your "Making" project and think "oh, I should add a task here," you have to leave, go to Inbox, create the task, assign it to Making, then navigate back. Every view should have a "+ Add task" affordance that pre-fills the current context (current project, today's date if on Today view, etc.).

**Maestro's position is good but the panel should be smarter.** The right-side slide-in is the right pattern (VS Code, Notion AI, Copilot all do this). But Maestro should be context-aware — if you open it from a project page, it should scope to that project. If you open it from Today, it should focus on today's plan.

**The API key situation needs a longer-term plan.** Storing the user's Anthropic key in Supabase and calling the API from the browser works, but it means the key is exposed in network requests. A lightweight server-side proxy (Supabase Edge Function or Vercel serverless function) that holds the key server-side and proxies requests would be more secure. Not urgent, but worth noting for when other people start using this.

**The project tree will get unwieldy.** You already have 3 top-level groups (Personal Projects, Projects, Areas) with nested sub-items. Consider collapsible sections (which you may already have) and potentially a "starred" or "favorites" concept so your most-used projects are always visible without scrolling.
