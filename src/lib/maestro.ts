import Anthropic from '@anthropic-ai/sdk'
import type { Task, Project, Section } from '@/types'

// =============================================================================
// Types
// =============================================================================

export interface MaestroContext {
  projects: Project[]
  sections: Section[]
  tasks: Task[]
  inboxTasks: Task[]
  todayTasks: Task[]
  overdueTasks: Task[]
}

export interface MaestroMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface PendingAction {
  id: string
  type: 'create_task' | 'update_task' | 'complete_task' | 'delete_task' | 'create_project' | 'archive_project'
  description: string
  payload: Record<string, unknown>
}

export interface MaestroResponse {
  message: string
  pendingActions: PendingAction[]
}

// =============================================================================
// System Prompt
// =============================================================================

const SYSTEM_PROMPT = `You are Maestro, an AI assistant for Intend - a personal task and project management app.

Your role is to help the user manage their tasks, projects, and time effectively. You have full access to their task database and can both analyze their portfolio and take actions on their behalf.

## Personality
- Friendly but efficient - respect the user's time
- Proactive in suggestions but not pushy
- You can use the musical metaphor occasionally ("Let's orchestrate your day") but don't overdo it
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
- For write operations (create, update, delete), propose them clearly so the user can approve
- Be specific in your analysis - cite actual project names, task counts, dates
- If the user's request is ambiguous, ask for clarification
- Keep responses focused and actionable
- Format lists and data clearly using markdown

## Task Data Context
You will receive the user's current task data in each message. Use this to provide informed, specific responses.

When doing a portfolio review, consider:
- How many active projects are there? (More than 7-10 may be overcommitment)
- Which projects have no tasks or only completed tasks? (May be stale)
- Are there overdue tasks? How many?
- Is the inbox overflowing? (More than 10-15 items needs processing)
- Are deadlines clustering in any particular week?
- Are high-priority tasks getting attention?`

// =============================================================================
// Tool Definitions
// =============================================================================

const TOOLS: Anthropic.Tool[] = [
  // READ OPERATIONS
  {
    name: 'get_portfolio_summary',
    description: 'Get a high-level summary of the user\'s task portfolio including counts by status, projects, and upcoming deadlines.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_project_details',
    description: 'Get detailed information about a specific project including its tasks and sections.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: {
          type: 'string',
          description: 'The UUID of the project to get details for',
        },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'search_tasks',
    description: 'Search for tasks by title or description content.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query to match against task titles and descriptions',
        },
      },
      required: ['query'],
    },
  },

  // WRITE OPERATIONS
  {
    name: 'create_task',
    description: 'Create a new task. The user will need to approve this action.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'The title of the task',
        },
        description: {
          type: 'string',
          description: 'Optional description with more details',
        },
        project_id: {
          type: 'string',
          description: 'Optional project ID to add the task to. If omitted, goes to Inbox.',
        },
        due_date: {
          type: 'string',
          description: 'Optional due date in YYYY-MM-DD format',
        },
        priority: {
          type: 'number',
          description: 'Priority level: 0=none, 1=low, 2=medium, 3=high',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task',
    description: 'Update an existing task. The user will need to approve this action.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: {
          type: 'string',
          description: 'The UUID of the task to update',
        },
        title: {
          type: 'string',
          description: 'New title for the task',
        },
        description: {
          type: 'string',
          description: 'New description for the task',
        },
        due_date: {
          type: 'string',
          description: 'New due date in YYYY-MM-DD format, or null to remove',
        },
        priority: {
          type: 'number',
          description: 'New priority level: 0=none, 1=low, 2=medium, 3=high',
        },
        project_id: {
          type: 'string',
          description: 'Move task to a different project (or null for Inbox)',
        },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'complete_task',
    description: 'Mark a task as completed. The user will need to approve this action.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: {
          type: 'string',
          description: 'The UUID of the task to complete',
        },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'delete_task',
    description: 'Delete a task permanently. The user will need to approve this action.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: {
          type: 'string',
          description: 'The UUID of the task to delete',
        },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'create_project',
    description: 'Create a new project. The user will need to approve this action.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'The name of the project',
        },
        description: {
          type: 'string',
          description: 'Optional description of the project',
        },
        color: {
          type: 'string',
          description: 'Optional hex color for the project (e.g., #ff5733)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'archive_project',
    description: 'Archive a project (hide from active view). The user will need to approve this action.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: {
          type: 'string',
          description: 'The UUID of the project to archive',
        },
      },
      required: ['project_id'],
    },
  },
]

// =============================================================================
// Context Formatter
// =============================================================================

export function formatContextForAI(context: MaestroContext): string {
  const { projects, tasks, inboxTasks, todayTasks, overdueTasks } = context

  const activeProjects = projects.filter(p => !p.is_archived)
  const openTasks = tasks.filter(t => t.status === 'open')

  // Group tasks by project
  const tasksByProject = new Map<string | null, Task[]>()
  for (const task of openTasks) {
    const key = task.project_id
    if (!tasksByProject.has(key)) {
      tasksByProject.set(key, [])
    }
    tasksByProject.get(key)!.push(task)
  }

  let contextStr = `## Current Task Data

### Summary
- Total open tasks: ${openTasks.length}
- Inbox tasks: ${inboxTasks.length}
- Due today: ${todayTasks.length}
- Overdue: ${overdueTasks.length}
- Active projects: ${activeProjects.length}

### Overdue Tasks
${overdueTasks.length === 0 ? 'None! Great job staying on top of things.' : overdueTasks.map(t => `- "${t.title}" (due ${t.due_date})${t.project ? ` in ${t.project.name}` : ''}`).join('\n')}

### Due Today
${todayTasks.length === 0 ? 'Nothing scheduled for today.' : todayTasks.map(t => `- "${t.title}"${t.project ? ` in ${t.project.name}` : ''}`).join('\n')}

### Inbox (Uncategorized)
${inboxTasks.length === 0 ? 'Inbox is empty.' : inboxTasks.slice(0, 10).map(t => `- "${t.title}"`).join('\n')}${inboxTasks.length > 10 ? `\n... and ${inboxTasks.length - 10} more` : ''}

### Projects
${activeProjects.map(p => {
  const projectTasks = tasksByProject.get(p.id) || []
  return `- **${p.name}**: ${projectTasks.length} open tasks`
}).join('\n')}
`

  return contextStr
}

// =============================================================================
// Main Chat Function
// =============================================================================

export async function chat(
  apiKey: string,
  messages: MaestroMessage[],
  context: MaestroContext
): Promise<MaestroResponse> {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true, // Required for browser-side usage
  })

  // Format the context and prepend to the last user message
  const contextStr = formatContextForAI(context)

  // Build the messages array for the API
  // Only include context in the first message to avoid token bloat
  const apiMessages: Anthropic.MessageParam[] = messages.map((msg, idx) => {
    if (msg.role === 'user' && idx === messages.length - 1) {
      // Append context to the last user message
      return {
        role: 'user' as const,
        content: `${contextStr}\n\n---\n\nUser message: ${msg.content}`,
      }
    }
    return {
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }
  })

  // Retry logic for transient errors
  let lastError: Error | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: apiMessages,
      })

      // Process the response
      const pendingActions: PendingAction[] = []
      let messageText = ''

      for (const block of response.content) {
        if (block.type === 'text') {
          messageText += block.text
        } else if (block.type === 'tool_use') {
          // Convert tool calls to pending actions
          const action = toolCallToAction(block)
          if (action) {
            pendingActions.push(action)
          }
        }
      }

      // If there are pending actions, add a note about them
      if (pendingActions.length > 0 && messageText) {
        messageText += '\n\n*I\'ve prepared the actions above for your approval.*'
      }

      return {
        message: messageText || 'I\'ve prepared some actions for you to review.',
        pendingActions,
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      // Check if it's a retryable error (500, 529, etc.)
      const errorMessage = lastError.message.toLowerCase()
      const isRetryable = errorMessage.includes('500') ||
                          errorMessage.includes('internal server') ||
                          errorMessage.includes('overloaded') ||
                          errorMessage.includes('529')

      if (!isRetryable || attempt === 1) {
        // Parse and throw a cleaner error message
        throw new Error(parseApiError(lastError.message))
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  throw lastError || new Error('Unknown error')
}

function parseApiError(errorMessage: string): string {
  // Try to extract a cleaner error message
  if (errorMessage.includes('401') || errorMessage.includes('invalid_api_key')) {
    return 'Invalid API key. Please check your key in Settings.'
  }
  if (errorMessage.includes('429') || errorMessage.includes('rate_limit')) {
    return 'Rate limited. Please wait a moment and try again.'
  }
  if (errorMessage.includes('500') || errorMessage.includes('internal server')) {
    return 'Anthropic API is temporarily unavailable. Please try again.'
  }
  if (errorMessage.includes('529') || errorMessage.includes('overloaded')) {
    return 'Anthropic API is overloaded. Please try again in a moment.'
  }
  if (errorMessage.includes('insufficient_quota')) {
    return 'API quota exceeded. Please check your Anthropic account.'
  }
  // Return a generic but friendly message
  return 'Something went wrong. Please try again.'
}

// =============================================================================
// Tool Call Handlers
// =============================================================================

function toolCallToAction(toolUse: Anthropic.ToolUseBlock): PendingAction | null {
  const input = toolUse.input as Record<string, unknown>

  switch (toolUse.name) {
    case 'create_task':
      return {
        id: toolUse.id,
        type: 'create_task',
        description: `Create task: "${input.title}"${input.due_date ? ` (due ${input.due_date})` : ''}`,
        payload: input,
      }

    case 'update_task':
      return {
        id: toolUse.id,
        type: 'update_task',
        description: `Update task: ${Object.keys(input).filter(k => k !== 'task_id').join(', ')}`,
        payload: input,
      }

    case 'complete_task':
      return {
        id: toolUse.id,
        type: 'complete_task',
        description: 'Complete task',
        payload: input,
      }

    case 'delete_task':
      return {
        id: toolUse.id,
        type: 'delete_task',
        description: 'Delete task',
        payload: input,
      }

    case 'create_project':
      return {
        id: toolUse.id,
        type: 'create_project',
        description: `Create project: "${input.name}"`,
        payload: input,
      }

    case 'archive_project':
      return {
        id: toolUse.id,
        type: 'archive_project',
        description: 'Archive project',
        payload: input,
      }

    // Read operations don't create pending actions - they're handled inline
    case 'get_portfolio_summary':
    case 'get_project_details':
    case 'search_tasks':
      return null

    default:
      return null
  }
}

// =============================================================================
// Execute Approved Actions
// =============================================================================

export interface ActionExecutor {
  createTask: (payload: Record<string, unknown>) => Promise<void>
  updateTask: (payload: Record<string, unknown>) => Promise<void>
  completeTask: (taskId: string) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  createProject: (payload: Record<string, unknown>) => Promise<void>
  archiveProject: (projectId: string) => Promise<void>
}

export async function executeAction(
  action: PendingAction,
  executor: ActionExecutor
): Promise<void> {
  switch (action.type) {
    case 'create_task':
      await executor.createTask(action.payload)
      break
    case 'update_task':
      await executor.updateTask(action.payload)
      break
    case 'complete_task':
      await executor.completeTask(action.payload.task_id as string)
      break
    case 'delete_task':
      await executor.deleteTask(action.payload.task_id as string)
      break
    case 'create_project':
      await executor.createProject(action.payload)
      break
    case 'archive_project':
      await executor.archiveProject(action.payload.project_id as string)
      break
  }
}
