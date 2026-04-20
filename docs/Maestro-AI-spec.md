# Maestro - AI Assistant for Intend

## Overview

Maestro is a conversational AI assistant that helps users manage their tasks and projects in Intend. It lives in a slide-over drawer and has full access to the user's task database, enabling both analysis (like portfolio reviews) and direct actions (like creating or completing tasks).

---

## Architecture

### Technical Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **API Key Management** | User provides their own | Simplifies billing, no abuse concerns, user controls costs |
| **API Calls** | Direct from browser | Simplest for prototyping; key stays in user's browser (secure). Can migrate to Edge Functions later if needed |
| **Model** | Claude Sonnet | Best balance of speed, cost, and capability for task management |
| **Context Scope** | Full task database + conversation history | AI can analyze entire portfolio and remember past discussions |
| **History Storage** | Supabase database | Conversations persist across devices and sessions |

### Data Flow

```
User types message
       ↓
React chat component
       ↓
Fetch full task context from Supabase
       ↓
Call Anthropic API (claude-sonnet) with:
  - System prompt (Maestro persona + available tools)
  - Conversation history
  - Current task/project data
       ↓
AI responds with text and/or tool calls
       ↓
Tool calls → Action Queue (pending approval)
       ↓
User approves → Execute against Supabase
       ↓
Invalidate React Query cache → UI updates
```

---

## User Interface

### Location & Trigger

- **Slide-over drawer** from the right side of the screen
- Triggered by a chat icon button in the app header or sidebar
- Can be closed/minimized while keeping conversation state

### Chat Interface

```
┌─────────────────────────────────────┐
│  Maestro                        ✕   │
├─────────────────────────────────────┤
│                                     │
│  [Conversation history scrolls]    │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Maestro:                    │   │
│  │ I found 3 stale projects... │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Pending Actions (2)     ▼   │   │
│  │ ☑ Archive "Old Project"     │   │
│  │ ☑ Create task "Review X"    │   │
│  │ [Approve Selected] [Clear]  │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│  [Type a message...]        [Send]  │
└─────────────────────────────────────┘
```

### Action Queue

When Maestro proposes changes, they appear in an **Action Queue** panel:

- Each proposed action has a checkbox (default: checked)
- User can uncheck actions they don't want
- "Approve Selected" executes checked actions
- "Clear" dismisses all pending actions
- Actions show a preview: "Create task: Call mom (Due: tomorrow)"

### Proactivity

- **Fully reactive**: Maestro only responds when the user initiates
- No unsolicited notifications or interruptions
- User can ask for portfolio review, daily planning, or any analysis on demand

---

## Capabilities

### 1. Portfolio Review

Analyzes the user's entire task ecosystem:

- **Overcommitment detection**: Too many active projects, deadline clustering
- **Stale project identification**: Projects with no activity in 14+ days
- **Priority alignment check**: Are high-priority tasks getting attention?
- **Cross-project conflicts**: Multiple deadlines in the same week

**Example prompt**: "Do a portfolio review" or "Am I overcommitted?"

### 2. Project Analysis

Deep dive into a single project:

- Missing tasks or gaps in the plan
- Unrealistic timelines
- Dependency issues
- Suggested next actions

**Example prompt**: "Review my Career Strategy project"

### 3. Daily Planning

Help prioritize today's work:

- Suggest task order based on priority, deadlines, dependencies
- Identify what's realistic for today
- Flag blocked tasks

**Example prompt**: "Help me plan my day" or "What should I work on?"

### 4. Direct Task Management

Full CRUD operations on tasks and projects:

**Tasks:**
- Create new tasks (with title, description, due date, priority, project)
- Update existing tasks (reschedule, reprioritize, edit)
- Complete tasks
- Delete tasks
- Move tasks between projects/sections
- Reorder tasks

**Projects:**
- Create new projects
- Archive/unarchive projects
- Update project details

**Bulk Operations:**
- "Complete all tasks in section X"
- "Move overdue tasks to today"
- "Reschedule all tasks from project X by one week"

### 5. General Q&A

Answer questions about the user's tasks:

- "What's due this week?"
- "How many tasks do I have in my inbox?"
- "When did I last work on project X?"

---

## Tool Definitions

Maestro uses Claude's tool use feature. Available tools:

### Read Operations (no confirmation needed)

```typescript
// These execute immediately - just fetching data
get_all_projects()
get_project(project_id)
get_tasks(filters: { project_id?, status?, due_before?, due_after? })
get_task(task_id)
get_inbox_tasks()
get_today_tasks()
get_overdue_tasks()
get_completed_tasks(limit)
```

### Write Operations (require confirmation)

```typescript
// These go to the Action Queue for approval
create_task(title, { project_id?, due_date?, priority?, description? })
update_task(task_id, updates)
complete_task(task_id)
delete_task(task_id)
move_task(task_id, { project_id?, section_id? })

create_project(name, { description?, color?, parent_id? })
update_project(project_id, updates)
archive_project(project_id)

// Bulk operations
complete_tasks(task_ids[])
move_tasks(task_ids[], destination)
reschedule_tasks(task_ids[], date_offset)
```

---

## Database Schema

### New Table: `conversations`

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT, -- Optional: auto-generated from first message
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON conversations(user_id);
```

### New Table: `messages`

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    tool_calls JSONB, -- Store any tool calls made
    tool_results JSONB, -- Store results of tool executions
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
```

### User Settings (extend profiles or new table)

```sql
-- Option 1: Add to profiles
ALTER TABLE profiles ADD COLUMN anthropic_api_key TEXT;

-- Option 2: Separate settings table
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    anthropic_api_key TEXT,
    maestro_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note:** API key is encrypted at rest by Supabase. For extra security, could encrypt client-side before storing.

---

## System Prompt

```
You are Maestro, an AI assistant for Intend - a personal task and project management app.

Your role is to help the user manage their tasks, projects, and time effectively. You have full access to their task database and can both analyze their portfolio and take actions on their behalf.

## Personality
- Friendly but efficient - respect the user's time
- Proactive in suggestions but not pushy
- Use the musical metaphor occasionally ("Let's orchestrate your day")
- Be concise - this is a productivity app, not a chatbot

## Capabilities
You can:
1. Analyze their portfolio (overcommitment, stale projects, priorities)
2. Review individual projects for gaps or issues
3. Help plan their day
4. Create, update, complete, and delete tasks
5. Manage projects (create, archive, organize)
6. Answer questions about their tasks and workload

## Important Guidelines
- When taking actions, ALWAYS use the provided tools - don't just describe what you would do
- For write operations (create, update, delete), the user will need to approve before execution
- Be specific in your analysis - cite actual project names, task counts, dates
- If the user's request is ambiguous, ask for clarification
- Keep responses focused and actionable

## Context
You have access to:
- All of the user's projects, sections, and tasks
- Task metadata: due dates, priorities, completion status, descriptions
- Conversation history from previous chats

When analyzing, consider:
- Tasks due today or overdue (high priority)
- Project activity (when was the last task completed?)
- Deadline clustering (multiple things due same week)
- Inbox size (uncategorized tasks needing attention)
```

---

## Implementation Plan

### Phase 1: Foundation
1. [ ] Create database migration for `conversations` and `messages` tables
2. [ ] Add `anthropic_api_key` to user settings
3. [ ] Build settings UI for API key input
4. [ ] Create basic slide-over drawer component

### Phase 2: Chat Core
5. [ ] Implement Anthropic SDK integration (browser-side)
6. [ ] Build chat message components (user/assistant bubbles)
7. [ ] Implement conversation history (load/save to Supabase)
8. [ ] Add message input with send functionality

### Phase 3: Context & Tools
9. [ ] Build context fetcher (load all tasks/projects for AI)
10. [ ] Define tool schemas for read operations
11. [ ] Define tool schemas for write operations
12. [ ] Implement tool execution layer

### Phase 4: Action Queue
13. [ ] Build Action Queue UI component
14. [ ] Implement action approval flow
15. [ ] Connect approved actions to existing mutation hooks
16. [ ] Add success/error feedback

### Phase 5: Polish
17. [ ] Add loading states and streaming responses
18. [ ] Implement conversation management (new chat, history)
19. [ ] Add keyboard shortcuts (Cmd+K to open?)
20. [ ] Error handling and edge cases

---

## Open Questions / Future Considerations

1. **Rate limiting**: Should we add client-side rate limiting to prevent accidental API cost spikes?

2. **Token management**: Large task databases could exceed context limits. May need smart summarization or chunking.

3. **Streaming**: Should responses stream in real-time or wait for complete response?

4. **Mobile**: How does the slide-over work on mobile? Maybe full-screen modal instead?

5. **Offline**: What happens if user is offline? Queue messages for later?

6. **Multi-model**: Should users be able to choose between Haiku/Sonnet/Opus per-message for cost control?

---

## Success Metrics

- User can complete a portfolio review in < 30 seconds
- AI-proposed actions have > 80% approval rate (good suggestions)
- Chat response time < 3 seconds for typical queries
- Users return to Maestro weekly (engagement)
