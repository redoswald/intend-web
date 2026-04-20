import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { TaskItem } from './TaskItem'
import { TaskEditor } from './TaskEditor'
import { computeTaskReorder, useReorderTask, type TaskReorderUpdate } from '@/hooks/useTasks'
import type { Task } from '@/types'

interface DragIndicator {
  targetId: string
  zone: 'above' | 'nest' | 'below'
}

interface TaskListProps {
  tasks: Task[]
  showProject?: boolean
  onTaskClick?: (task: Task) => void
  emptyMessage?: string
  editingTask?: Task | null
  onEditClose?: () => void
  editingTaskEditorProps?: Record<string, unknown>
}

export function TaskList({ tasks, showProject = false, onTaskClick, emptyMessage = 'No tasks', editingTask, onEditClose, editingTaskEditorProps }: TaskListProps) {
  const [dragIndicator, setDragIndicator] = useState<DragIndicator | null>(null)
  const draggedIdRef = useRef<string | null>(null)
  const reorderTask = useReorderTask()

  // Flatten tasks to include subtasks for reorder computation
  const allTasks = useRef<Task[]>([])
  const flatTasks: Task[] = []
  function collectTasks(taskList: Task[]) {
    for (const t of taskList) {
      flatTasks.push(t)
      if (t.subtasks) collectTasks(t.subtasks)
    }
  }
  collectTasks(tasks)
  allTasks.current = flatTasks

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const taskData = e.dataTransfer.getData('application/intend-task')
    if (!taskData || !dragIndicator) {
      setDragIndicator(null)
      return
    }

    const { id: draggedId } = JSON.parse(taskData)
    const { targetId, zone } = dragIndicator
    const all = allTasks.current

    if (draggedId === targetId) {
      setDragIndicator(null)
      return
    }

    const targetTask = all.find(t => t.id === targetId)
    if (!targetTask) {
      setDragIndicator(null)
      return
    }

    if (zone === 'nest') {
      // Nest under target — put at end of target's children
      const childCount = all.filter(t => t.parent_task_id === targetId).length
      const updates: TaskReorderUpdate[] = [{
        id: draggedId,
        sort_order: childCount,
        parent_task_id: targetId,
      }]
      reorderTask.mutate(updates, {
        onSuccess: () => toast('Task moved'),
      })
    } else {
      // above/below — keep same parent as target
      const newParentId = targetTask.parent_task_id
      const updates = computeTaskReorder(all, draggedId, targetId, zone, newParentId)
      if (updates.length > 0) {
        reorderTask.mutate(updates, {
          onSuccess: () => toast('Task moved'),
        })
      }
    }

    setDragIndicator(null)
    draggedIdRef.current = null
  }, [dragIndicator, reorderTask])

  const handleDragEnd = useCallback(() => {
    setDragIndicator(null)
    draggedIdRef.current = null
  }, [])

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div
      className="divide-y divide-gray-100"
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
    >
      {tasks.map((task) =>
        editingTask?.id === task.id ? (
          <div key={task.id} className="py-2">
            <TaskEditor
              task={editingTask}
              onClose={onEditClose!}
              {...editingTaskEditorProps}
            />
          </div>
        ) : (
          <DraggableTaskRow
            key={task.id}
            task={task}
            showProject={showProject}
            onClick={onTaskClick ? () => onTaskClick(task) : undefined}
            onTaskClick={onTaskClick}
            editingTask={editingTask}
            onEditClose={onEditClose}
            dragIndicator={dragIndicator}
            onDragIndicator={setDragIndicator}
            draggedIdRef={draggedIdRef}
          />
        )
      )}
    </div>
  )
}

interface DraggableTaskRowProps {
  task: Task
  showProject: boolean
  onClick?: () => void
  onTaskClick?: (task: Task) => void
  editingTask?: Task | null
  onEditClose?: () => void
  dragIndicator: DragIndicator | null
  onDragIndicator: (indicator: DragIndicator | null) => void
  draggedIdRef: React.MutableRefObject<string | null>
}

function DraggableTaskRow({ task, showProject, onClick, onTaskClick, editingTask, onEditClose, dragIndicator, onDragIndicator, draggedIdRef }: DraggableTaskRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const isSelf = draggedIdRef.current === task.id
  const indicator = dragIndicator?.targetId === task.id ? dragIndicator : null

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/intend-task', JSON.stringify({ id: task.id, title: task.title }))
    e.dataTransfer.effectAllowed = 'move'
    draggedIdRef.current = task.id
  }

  function handleDragOver(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes('application/intend-task')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (isSelf) return

    const rect = rowRef.current?.getBoundingClientRect()
    if (!rect) return

    const y = e.clientY - rect.top
    const ratio = y / rect.height

    let zone: 'above' | 'nest' | 'below'
    if (ratio < 0.25) zone = 'above'
    else if (ratio > 0.75) zone = 'below'
    else zone = 'nest'

    onDragIndicator({ targetId: task.id, zone })
  }

  function handleDragLeave(e: React.DragEvent) {
    if (rowRef.current && !rowRef.current.contains(e.relatedTarget as Node)) {
      if (dragIndicator?.targetId === task.id) {
        onDragIndicator(null)
      }
    }
  }

  return (
    <div ref={rowRef} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
      {/* Above insertion line */}
      {indicator && indicator.zone === 'above' && !isSelf && (
        <div className="h-0.5 bg-accent-500 rounded-full mx-3" />
      )}
      {/* Nest highlight is applied via className on the TaskItem wrapper */}
      <div className={
        indicator && indicator.zone === 'nest' && !isSelf
          ? 'ring-2 ring-accent-500 bg-accent-50 rounded-md'
          : isSelf && draggedIdRef.current ? 'opacity-40' : ''
      }>
        <TaskItem
          task={task}
          showProject={showProject}
          onClick={onClick}
          onTaskClick={onTaskClick}
          editingTask={editingTask}
          onEditClose={onEditClose}
          draggable
          onDragStart={handleDragStart}
        />
      </div>
      {/* Below insertion line */}
      {indicator && indicator.zone === 'below' && !isSelf && (
        <div className="h-0.5 bg-accent-500 rounded-full mx-3" />
      )}
    </div>
  )
}
