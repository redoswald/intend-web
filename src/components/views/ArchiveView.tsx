import { Archive, ArchiveRestore } from 'lucide-react'
import { toast } from 'sonner'
import { MainPanel } from '@/components/layout/MainPanel'
import { useArchivedProjects, useUnarchiveProject } from '@/hooks/useProjects'
import { useAllProjectTasks } from '@/hooks/useTasks'
import type { Project, Task } from '@/types'

export function ArchiveView() {
  const { data: projects = [], isLoading } = useArchivedProjects()

  return (
    <MainPanel title="Archive">
      <div className="max-w-2xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-500" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Archive className="w-8 h-8 mx-auto mb-3 text-gray-300" />
            <p>No archived projects</p>
          </div>
        ) : (
          <div className="space-y-6">
            {projects.map((project) => (
              <ArchivedProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </MainPanel>
  )
}

function ArchivedProjectCard({ project }: { project: Project }) {
  const { data: tasks = [] } = useAllProjectTasks(project.id)
  const unarchive = useUnarchiveProject()

  function handleUnarchive() {
    const name = project.name
    unarchive.mutate(project.id, {
      onSuccess: () => {
        toast(`"${name}" restored`)
      },
    })
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* Project header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: project.color }}
        />
        <span className="font-medium text-gray-900 flex-1">{project.name}</span>
        <button
          onClick={handleUnarchive}
          disabled={unarchive.isPending}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent-600 transition-colors disabled:opacity-50"
        >
          <ArchiveRestore className="w-4 h-4" />
          Unarchive
        </button>
      </div>

      {/* Tasks */}
      {tasks.length === 0 ? (
        <div className="px-4 py-3 text-sm text-gray-400">No tasks</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {tasks.map((task) => (
            <ArchivedTaskItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}

function ArchivedTaskItem({ task }: { task: Task }) {
  const isDone = task.status === 'done'

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      {/* Check circle */}
      <span
        className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${
          isDone ? 'bg-gray-300' : 'border-2 border-gray-300'
        }`}
      >
        {isDone && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>

      {/* Title */}
      <span className={isDone ? 'text-gray-400 line-through' : 'text-gray-900'}>
        {task.title}
      </span>
    </div>
  )
}
