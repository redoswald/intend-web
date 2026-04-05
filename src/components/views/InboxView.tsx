import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MainPanel } from '@/components/layout/MainPanel'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskEditor } from '@/components/tasks/TaskEditor'
import { useTasks } from '@/hooks/useTasks'
import type { Task } from '@/types'

export function InboxView() {
  const { data: tasks = [], isLoading } = useTasks({ inbox: true })
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showAddTask, setShowAddTask] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setShowAddTask(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  return (
    <MainPanel title="Inbox">
      <div className="max-w-2xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-500" />
          </div>
        ) : (
          <>
            <TaskList
              tasks={tasks}
              onTaskClick={(task) => setEditingTask(task)}
              emptyMessage="Your inbox is empty"
              editingTask={editingTask}
              onEditClose={() => setEditingTask(null)}
            />

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
                  onClose={() => setShowAddTask(false)}
                />
              </div>
            )}
          </>
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
