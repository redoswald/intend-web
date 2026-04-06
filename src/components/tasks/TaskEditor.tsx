import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { useProjects } from '@/hooks/useProjects'
import { useCreateTask, useUpdateTask, useCompleteTask, useUncompleteTask, useDeleteTask, useSearchTasks, useAddDependency, useRemoveDependency } from '@/hooks/useTasks'
import { RecurrenceBuilder } from './RecurrenceBuilder'
import type { Task, CreateTaskInput } from '@/types'

interface TaskEditorProps {
  task?: Task | null
  defaultProjectId?: string | null
  defaultSectionId?: string | null
  defaultDueDate?: string | null
  onClose: () => void
  onSaved?: () => void
}

export function TaskEditor({ task, defaultProjectId, defaultSectionId, defaultDueDate, onClose, onSaved }: TaskEditorProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [projectId, setProjectId] = useState<string | null>(task?.project_id ?? defaultProjectId ?? null)
  const [sectionId] = useState<string | null>(task?.section_id ?? defaultSectionId ?? null)
  const [dueDate, setDueDate] = useState(task?.due_date ?? defaultDueDate ?? '')
  const [deadline, setDeadline] = useState(task?.deadline ?? '')
  const [priority, setPriority] = useState(task?.priority ?? 0)
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(task?.recurrence_rule ?? null)
  const [error, setError] = useState<string | null>(null)

  const { data: projects = [] } = useProjects()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()

  const isEditing = !!task
  const formRef = useRef<HTMLFormElement>(null)

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (formRef.current && !formRef.current.contains(e.target as Node)) {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    if (!isEditing) return
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isEditing, handleClickOutside])

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setProjectId(task.project_id)
      setDueDate(task.due_date ?? '')
      setDeadline(task.deadline ?? '')
      setPriority(task.priority)
      setRecurrenceRule(task.recurrence_rule ?? null)
    }
  }, [task])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) return

    const data: CreateTaskInput = {
      title: title.trim(),
      description: description.trim() || null,
      project_id: projectId,
      section_id: sectionId,
      due_date: dueDate || null,
      deadline: deadline || null,
      priority,
      recurrence_rule: recurrenceRule,
      recurrence_base_date: recurrenceRule && dueDate ? dueDate : null,
    }

    try {
      if (isEditing) {
        await updateTask.mutateAsync({ id: task.id, ...data })
      } else {
        await createTask.mutateAsync(data)
        toast('Task created')
      }

      onSaved?.()
      onClose()
    } catch (err) {
      console.error('Task save error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save task')
    }
  }

  const priorityOptions = [
    { value: 0, label: 'None', color: 'bg-gray-300' },
    { value: 1, label: 'Low', color: 'bg-blue-400' },
    { value: 2, label: 'Medium', color: 'bg-yellow-500' },
    { value: 3, label: 'High', color: 'bg-red-500' },
  ]

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        className="w-full text-lg font-medium border-none outline-none focus:ring-0 placeholder-gray-400"
        autoFocus
      />

      {/* Description */}
      <div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add notes, context, or details... (Markdown supported)"
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent-500 placeholder-gray-400 resize-none"
        />
        {description && (
          <p className="mt-1 text-xs text-gray-400">Markdown supported: **bold**, *italic*, [links](url), `code`</p>
        )}
      </div>

      {/* Fields row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Project selector */}
        <select
          value={projectId ?? ''}
          onChange={(e) => setProjectId(e.target.value || null)}
          className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white"
        >
          <option value="">Inbox</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Due date (scheduled) */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Scheduled:</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1.5"
          />
        </div>

        {/* Deadline (hard deadline) */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-accent-600">Deadline:</span>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="text-sm border border-accent-200 rounded-md px-2 py-1.5"
          />
        </div>

        {/* Recurrence */}
        <RecurrenceBuilder value={recurrenceRule} onChange={setRecurrenceRule} />

        {/* Priority */}
        <div className="flex items-center gap-1">
          {priorityOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPriority(opt.value)}
              className={`w-6 h-6 rounded-full border-2 ${opt.color} ${
                priority === opt.value
                  ? 'ring-2 ring-offset-1 ring-gray-400'
                  : 'opacity-40 hover:opacity-70'
              }`}
              title={opt.label}
            />
          ))}
        </div>
      </div>

      {/* Dependencies — only when editing */}
      {isEditing && (
        <DependencySection task={task} />
      )}

      {/* Subtasks — only when editing */}
      {isEditing && (
        <SubtaskSection parentTask={task} />
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          className="px-3 py-1.5 text-sm font-medium text-white bg-accent-500 hover:bg-accent-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isEditing ? 'Save' : 'Add task'}
        </button>
      </div>
    </form>
  )
}

function SubtaskSection({ parentTask }: { parentTask: Task }) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [showInput, setShowInput] = useState(false)
  const createTask = useCreateTask()
  const completeTask = useCompleteTask()
  const uncompleteTask = useUncompleteTask()
  const deleteTask = useDeleteTask()
  const inputRef = useRef<HTMLInputElement>(null)

  const subtasks = parentTask.subtasks ?? []

  async function handleAddSubtask() {
    const title = newSubtaskTitle.trim()
    if (!title) return

    await createTask.mutateAsync({
      title,
      parent_task_id: parentTask.id,
      project_id: parentTask.project_id,
      section_id: parentTask.section_id,
    })
    setNewSubtaskTitle('')
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddSubtask()
    }
    if (e.key === 'Escape') {
      setNewSubtaskTitle('')
      setShowInput(false)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Subtasks</span>
        <span className="text-xs text-gray-400">{subtasks.filter(s => s.status === 'open').length}/{subtasks.length}</span>
      </div>

      {/* Existing subtasks */}
      {subtasks.length > 0 && (
        <div className="space-y-0.5">
          {subtasks.map(subtask => (
            <div key={subtask.id} className="flex items-center gap-2 group py-0.5">
              <button
                type="button"
                onClick={() => {
                  if (subtask.status === 'done') {
                    uncompleteTask.mutate(subtask.id)
                  } else {
                    completeTask.mutate(subtask)
                  }
                }}
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                  subtask.status === 'done'
                    ? 'bg-gray-300 border-gray-300'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {subtask.status === 'done' && (
                  <svg className="w-full h-full text-white p-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className={`text-sm flex-1 ${subtask.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {subtask.title}
              </span>
              <button
                type="button"
                onClick={() => deleteTask.mutate(subtask.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-opacity"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add subtask */}
      {showInput ? (
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full border-2 border-dashed border-gray-300 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (!newSubtaskTitle.trim()) setShowInput(false) }}
            placeholder="Subtask title"
            className="flex-1 text-sm border-none outline-none focus:ring-0 placeholder-gray-400 py-0.5"
            autoFocus
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowInput(true)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-accent-600 transition-colors py-0.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add subtask
        </button>
      )}
    </div>
  )
}

function DependencySection({ task }: { task: Task }) {
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [localDeps, setLocalDeps] = useState<Pick<Task, 'id' | 'title'>[]>(task.dependencies ?? [])
  const { data: results = [] } = useSearchTasks(search)
  const addDependency = useAddDependency()
  const removeDependency = useRemoveDependency()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync from props when server data updates
  useEffect(() => {
    setLocalDeps(task.dependencies ?? [])
  }, [task.dependencies])

  const depIds = new Set(localDeps.map(d => d.id))

  // Filter out self and existing dependencies from search results
  const filteredResults = results.filter(t => t.id !== task.id && !depIds.has(t.id))

  useEffect(() => {
    if (!showSearch) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSearch(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSearch])

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <LinkIcon />
        <span className="text-xs font-medium text-gray-500">Dependencies</span>
      </div>

      {/* Existing dependencies */}
      {localDeps.length > 0 && (
        <div className="flex flex-wrap gap-1.5 ml-5">
          {localDeps.map(dep => (
            <span key={dep.id} className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded flex items-center gap-1.5">
              {dep.title}
              <button
                type="button"
                onClick={() => {
                  setLocalDeps(prev => prev.filter(d => d.id !== dep.id))
                  removeDependency.mutate({ taskId: task.id, dependsOnTaskId: dep.id })
                }}
                className="text-amber-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add dependency */}
      <div ref={dropdownRef} className="relative ml-5">
        {!showSearch ? (
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add dependency...
          </button>
        ) : (
          <div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for a blocking task..."
              className="w-full text-sm border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-gray-400"
              autoFocus
            />
            {filteredResults.length > 0 && (
              <div className="absolute z-10 mt-1 left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {filteredResults.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setLocalDeps(prev => [...prev, { id: t.id, title: t.title }])
                      addDependency.mutate({ taskId: task.id, dependsOnTaskId: t.id })
                      setSearch('')
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 transition-colors flex items-center gap-2"
                  >
                    <span className="truncate">{t.title}</span>
                    {t.project && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {t.project.name}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function LinkIcon() {
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  )
}
