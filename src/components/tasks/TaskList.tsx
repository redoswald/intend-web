import { TaskItem } from './TaskItem'
import { TaskEditor } from './TaskEditor'
import type { Task } from '@/types'

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
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
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
          <TaskItem
            key={task.id}
            task={task}
            showProject={showProject}
            onClick={onTaskClick ? () => onTaskClick(task) : undefined}
          />
        )
      )}
    </div>
  )
}
