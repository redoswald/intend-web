import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useProjects } from '@/hooks/useProjects'
import { useCreateTask, useUpdateTask } from '@/hooks/useTasks'
import { RecurrenceBuilder } from './RecurrenceBuilder'
import type { Task, CreateTaskInput } from '@/types'

interface TaskEditorProps {
  task?: Task | null
  defaultProjectId?: string | null
  defaultSectionId?: string | null
  onClose: () => void
  onSaved?: () => void
}

export function TaskEditor({ task, defaultProjectId, defaultSectionId, onClose, onSaved }: TaskEditorProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [projectId, setProjectId] = useState<string | null>(task?.project_id ?? defaultProjectId ?? null)
  const [sectionId] = useState<string | null>(task?.section_id ?? defaultSectionId ?? null)
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [deadline, setDeadline] = useState(task?.deadline ?? '')
  const [priority, setPriority] = useState(task?.priority ?? 0)
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(task?.recurrence_rule ?? null)
  const [error, setError] = useState<string | null>(null)

  const { data: projects = [] } = useProjects()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()

  const isEditing = !!task

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
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-4">
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
