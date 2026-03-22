import { useState, useMemo } from 'react'
import { isToday, isPast, parseISO } from 'date-fns'
import { MainPanel } from '@/components/layout/MainPanel'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskEditor } from '@/components/tasks/TaskEditor'
import { useTasks } from '@/hooks/useTasks'
import type { Task } from '@/types'

export function TodayView() {
  const { data: tasks = [], isLoading } = useTasks({ today: true })
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showAddTask, setShowAddTask] = useState(false)
  const todayStr = new Date().toISOString().split('T')[0]

  const { overdue, today } = useMemo(() => {
    const overdue: Task[] = []
    const today: Task[] = []

    tasks.forEach((task) => {
      if (!task.due_date) return

      const date = parseISO(task.due_date)
      if (isToday(date)) {
        today.push(task)
      } else if (isPast(date)) {
        overdue.push(task)
      }
    })

    return { overdue, today }
  }, [tasks])

  return (
    <MainPanel title="Today">
      <div className="max-w-2xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-500" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No tasks due today. Enjoy your day!
          </div>
        ) : (
          <div className="space-y-6">
            {overdue.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-red-600 mb-2">Overdue</h2>
                <TaskList
                  tasks={overdue}
                  showProject
                  onTaskClick={(task) => setEditingTask(task)}
                />
              </section>
            )}

            {today.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-600 mb-2">Today</h2>
                <TaskList
                  tasks={today}
                  showProject
                  onTaskClick={(task) => setEditingTask(task)}
                />
              </section>
            )}
          </div>
        )}

        {editingTask && (
          <div className="mt-4">
            <TaskEditor
              task={editingTask}
              onClose={() => setEditingTask(null)}
            />
          </div>
        )}

        {!showAddTask ? (
          <button
            onClick={() => setShowAddTask(true)}
            className="mt-4 flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-accent-600 transition-colors"
          >
            <PlusIcon />
            <span>Add task</span>
          </button>
        ) : (
          <div className="mt-4">
            <TaskEditor
              defaultDueDate={todayStr}
              onClose={() => setShowAddTask(false)}
            />
          </div>
        )}
      </div>
    </MainPanel>
  )
}

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}
