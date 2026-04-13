export type TaskStatus = 'open' | 'done' | 'cancelled'
export type SharePermission = 'view' | 'edit' | 'admin'

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  owner_id: string
  parent_id: string | null
  name: string
  description: string | null
  color: string
  sort_order: number
  is_archived: boolean
  created_at: string
  updated_at: string
  todoist_id?: string | null
  // Computed/joined
  task_count?: number
  children?: Project[]
}

export interface ProjectShare {
  id: string
  project_id: string
  shared_with_user_id: string
  permission: SharePermission
  created_at: string
  // Joined
  user?: Profile
}

export interface ProjectShareLink {
  id: string
  project_id: string
  created_by: string
  token: string
  permission: SharePermission
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export interface Section {
  id: string
  project_id: string
  name: string
  sort_order: number
  created_at: string
  todoist_id?: string | null
  // Computed
  tasks?: Task[]
}

export interface Task {
  id: string
  owner_id: string
  project_id: string | null
  section_id: string | null
  parent_task_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: number
  due_date: string | null
  due_time: string | null
  deadline: string | null  // Hard deadline (must be done by this date)
  recurrence_rule: string | null
  recurrence_base_date: string | null
  blocked_by: string | null
  sort_order: number
  completed_at: string | null
  created_at: string
  updated_at: string
  todoist_id?: string | null
  // Computed/joined
  subtasks?: Task[]
  project?: Pick<Project, 'id' | 'name' | 'color'>
  blocking_task?: Pick<Task, 'id' | 'title'>  // legacy single blocker
  dependencies?: Pick<Task, 'id' | 'title'>[] // multiple blockers
}

export interface TaskDependency {
  task_id: string
  depends_on_task_id: string
}

export interface CreateTaskInput {
  title: string
  project_id?: string | null
  section_id?: string | null
  parent_task_id?: string | null
  description?: string | null
  priority?: number
  due_date?: string | null
  due_time?: string | null
  deadline?: string | null
  recurrence_rule?: string | null
  recurrence_base_date?: string | null
}

export interface UpdateTaskInput {
  title?: string
  project_id?: string | null
  section_id?: string | null
  parent_task_id?: string | null
  description?: string | null
  status?: TaskStatus
  priority?: number
  due_date?: string | null
  due_time?: string | null
  deadline?: string | null
  blocked_by?: string | null
  sort_order?: number
  completed_at?: string | null
  recurrence_rule?: string | null
  recurrence_base_date?: string | null
}

export interface CreateProjectInput {
  name: string
  parent_id?: string | null
  description?: string | null
  color?: string
}

export interface UpdateProjectInput {
  name?: string
  parent_id?: string | null
  description?: string | null
  color?: string
  sort_order?: number
  is_archived?: boolean
}

// Maestro AI Types
export type MessageRole = 'user' | 'assistant'

export interface Conversation {
  id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  tool_calls: ToolCall[] | null
  tool_results: ToolResult[] | null
  created_at: string
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResult {
  tool_call_id: string
  result: unknown
  error?: string
}

export interface UserSettings {
  user_id: string
  anthropic_api_key: string | null
  maestro_enabled: boolean
  created_at: string
  updated_at: string
}

export interface PendingAction {
  id: string
  type: 'create_task' | 'update_task' | 'complete_task' | 'delete_task' | 'create_project' | 'archive_project'
  description: string
  payload: Record<string, unknown>
  approved: boolean
}
