import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { format, isToday, isPast, parseISO } from 'date-fns'
import Markdown from 'react-markdown'
import { toast } from 'sonner'
import { useCompleteTask, useUncompleteTask, useDeleteTask, useCreateTask } from '@/hooks/useTasks'
import { TaskEditor } from './TaskEditor'
import { describeRecurrence } from '@/lib/recurrenceHelper'
import type { Task, CreateTaskInput } from '@/types'

interface TaskItemProps {
  task: Task
  showProject?: boolean
  onClick?: () => void
  onTaskClick?: (task: Task) => void
  editingTask?: Task | null
  onEditClose?: () => void
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  depth?: number
  defaultExpanded?: boolean
}

const EXPANDED_STORAGE_KEY = 'opus-subtasks-expanded'

function getExpandedState(taskId: string): boolean | null {
  try {
    const stored = localStorage.getItem(EXPANDED_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed[taskId] ?? null
    }
  } catch {
    // Ignore localStorage errors
  }
  return null
}

function setExpandedState(taskId: string, expanded: boolean) {
  try {
    const stored = localStorage.getItem(EXPANDED_STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : {}
    parsed[taskId] = expanded
    localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify(parsed))
  } catch {
    // Ignore localStorage errors
  }
}

export function TaskItem({ task, showProject = false, onClick, onTaskClick, editingTask, onEditClose, draggable = true, onDragStart: onDragStartProp, depth = 0, defaultExpanded = false }: TaskItemProps) {
  const navigate = useNavigate()
  const completeTask = useCompleteTask()
  const uncompleteTask = useUncompleteTask()
  const deleteTask = useDeleteTask()
  const createTask = useCreateTask()

  // Use stored state if available, otherwise use defaultExpanded
  const [isExpanded, setIsExpanded] = useState(() => {
    const stored = getExpandedState(task.id)
    return stored !== null ? stored : defaultExpanded
  })

  const isCompleted = task.status === 'done'
  const isBlocked = !!task.blocked_by && !!task.blocking_task
  const dueDate = task.due_date ? parseISO(task.due_date) : null
  const deadline = task.deadline ? parseISO(task.deadline) : null
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !isCompleted
  const isDueToday = dueDate && isToday(dueDate)
  const isDeadlinePassed = deadline && isPast(deadline) && !isToday(deadline) && !isCompleted
  const isDeadlineToday = deadline && isToday(deadline)

  function handleToggleComplete(e: React.MouseEvent) {
    e.stopPropagation()
    if (isCompleted) {
      uncompleteTask.mutate(task.id)
    } else {
      completeTask.mutate(task, {
        onSuccess: (result) => {
          const nextDate = result.nextTask?.due_date
          const message = nextDate
            ? `"${task.title}" completed — next: ${format(parseISO(nextDate), 'MMM d')}`
            : `"${task.title}" completed`
          toast(message, {
            duration: 5000,
            action: {
              label: 'Undo',
              onClick: () => {
                uncompleteTask.mutate(task.id)
                if (result.nextTask) {
                  deleteTask.mutate(result.nextTask.id)
                }
              },
            },
          })
        },
      })
    }
  }

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/opus-task', JSON.stringify({
      id: task.id,
      title: task.title,
    }))
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    const snapshot: CreateTaskInput = {
      title: task.title,
      description: task.description ?? null,
      project_id: task.project_id ?? null,
      section_id: task.section_id ?? null,
      parent_task_id: task.parent_task_id ?? null,
      priority: task.priority,
      due_date: task.due_date ?? null,
      due_time: task.due_time ?? null,
      deadline: task.deadline ?? null,
      recurrence_rule: task.recurrence_rule ?? null,
      recurrence_base_date: task.recurrence_base_date ?? null,
    }
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        toast(`"${task.title}" deleted`, {
          duration: 5000,
          action: {
            label: 'Undo',
            onClick: () => createTask.mutate(snapshot),
          },
        })
      },
    })
  }

  const priorityColors: Record<number, string> = {
    0: 'border-gray-300',
    1: 'border-blue-400',
    2: 'border-yellow-500',
    3: 'border-red-500',
  }

  const hasSubtasks = task.subtasks && task.subtasks.length > 0
  const openSubtasks = task.subtasks?.filter(st => st.status === 'open') || []

  return (
    <div>
      <div
        onClick={onClick}
        draggable={draggable}
        onDragStart={onDragStartProp || handleDragStart}
        style={{ paddingLeft: depth > 0 ? `${depth * 24}px` : undefined }}
        className={cn(
          'group flex items-start gap-3 px-3 py-2 rounded-md transition-colors',
          onClick && 'cursor-pointer hover:bg-gray-50',
          draggable && 'cursor-grab active:cursor-grabbing',
          depth > 0 && 'border-l-2 border-gray-200 ml-3'
        )}
      >
      {/* Checkbox */}
      <button
        onClick={handleToggleComplete}
        className={cn(
          'mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors',
          priorityColors[task.priority],
          isCompleted && 'bg-gray-300 border-gray-300'
        )}
      >
        {isCompleted && (
          <svg className="w-full h-full text-white p-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-gray-900',
              isCompleted && 'line-through text-gray-400'
            )}
          >
            {task.title}
          </span>
        </div>

        {/* Description preview */}
        {task.description && (
          <div
            className={cn(
              'mt-1 text-sm text-gray-500 line-clamp-2',
              isCompleted && 'line-through text-gray-400'
            )}
          >
            <Markdown
              components={{
                p: ({ children }) => <span>{children}</span>,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-accent-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {children}
                  </a>
                ),
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => <code className="bg-gray-100 px-1 rounded text-xs font-mono">{children}</code>,
                // Flatten block elements for preview
                h1: ({ children }) => <span className="font-semibold">{children} </span>,
                h2: ({ children }) => <span className="font-semibold">{children} </span>,
                h3: ({ children }) => <span className="font-semibold">{children} </span>,
                ul: ({ children }) => <span>{children}</span>,
                ol: ({ children }) => <span>{children}</span>,
                li: ({ children }) => <span>{children}; </span>,
              }}
            >
              {task.description}
            </Markdown>
          </div>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {isBlocked && (
            <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1">
              <BlockedIcon />
              Blocked by: {task.blocking_task!.title}
            </span>
          )}
          {showProject && task.project && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/project/${task.project_id}`)
              }}
              className="text-xs text-gray-500 hover:text-gray-700 hover:underline flex items-center gap-1"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: task.project.color }}
              />
              {task.project.name}
            </button>
          )}
          {hasSubtasks && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                const newExpanded = !isExpanded
                setIsExpanded(newExpanded)
                setExpandedState(task.id, newExpanded)
              }}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-1 py-0.5 rounded hover:bg-gray-100 transition-colors"
            >
              <ChevronIcon className={cn('w-3 h-3 transition-transform', isExpanded && 'rotate-90')} />
              {openSubtasks.length}/{task.subtasks!.length}
            </button>
          )}
        </div>
      </div>

      {/* Date badges */}
      <div className="flex items-center gap-1.5">
        {/* Deadline badge (hard deadline) */}
        {deadline && (
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded flex items-center gap-1',
              isDeadlinePassed && 'text-red-700 bg-red-100 font-medium',
              isDeadlineToday && !isDeadlinePassed && 'text-accent-700 bg-accent-100 font-medium',
              !isDeadlinePassed && !isDeadlineToday && 'text-accent-600 bg-accent-50'
            )}
            title="Deadline"
          >
            <FlagIcon />
            {isDeadlinePassed
              ? format(deadline, 'MMM d')
              : isDeadlineToday
              ? 'Today'
              : format(deadline, 'MMM d')}
          </span>
        )}

        {/* Recurrence indicator */}
        {task.recurrence_rule && (
          <span
            className="text-xs text-teal-500 flex items-center"
            title={describeRecurrence(task.recurrence_rule)}
          >
            <RecurrenceIcon />
          </span>
        )}

        {/* Due date badge (planned date) */}
        {dueDate && (
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded',
              isOverdue && 'text-red-600 bg-red-50',
              isDueToday && !isOverdue && 'text-accent-600 bg-accent-50',
              !isOverdue && !isDueToday && 'text-gray-500 bg-gray-100'
            )}
            title="Scheduled"
          >
            {isOverdue
              ? format(dueDate, 'MMM d')
              : isDueToday
              ? 'Today'
              : format(dueDate, 'MMM d')}
          </span>
        )}

        {/* Delete button - visible on hover */}
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
          title="Delete task"
        >
          <TrashIcon />
        </button>
      </div>
      </div>

      {/* Subtasks */}
      {hasSubtasks && isExpanded && openSubtasks.length > 0 && (
        <div className="mt-1">
          {openSubtasks.map(subtask =>
            editingTask?.id === subtask.id ? (
              <div key={subtask.id} className="py-2" style={{ paddingLeft: `${(depth + 1) * 24}px` }}>
                <TaskEditor
                  task={editingTask}
                  onClose={onEditClose!}
                />
              </div>
            ) : (
              <TaskItem
                key={subtask.id}
                task={subtask}
                showProject={showProject}
                onClick={onTaskClick ? () => onTaskClick(subtask) : undefined}
                onTaskClick={onTaskClick}
                editingTask={editingTask}
                onEditClose={onEditClose}
                draggable
                depth={depth + 1}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}

function BlockedIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path d="M3 3a1 1 0 011-1h.5a.5.5 0 01.5.5v1a.5.5 0 00.5.5H17a1 1 0 01.8 1.6l-2.5 3.333a.5.5 0 000 .534L17.8 12.4a1 1 0 01-.8 1.6H5.5a.5.5 0 00-.5.5v3a.5.5 0 01-.5.5H4a1 1 0 01-1-1V3z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

function RecurrenceIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}
