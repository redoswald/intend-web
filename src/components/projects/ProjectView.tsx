import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { MainPanel } from '@/components/layout/MainPanel'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskEditor } from '@/components/tasks/TaskEditor'
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal'
import { ProjectHeader } from './ProjectHeader'
import { useProject, useProjects, useUpdateProject, useDeleteProject, useArchiveProject, getDescendantIds } from '@/hooks/useProjects'
import { useTasks } from '@/hooks/useTasks'
import { useSections, useDeleteSection, Section } from '@/hooks/useSections'
import { PROJECT_COLORS } from '@/lib/constants'
import type { Task } from '@/types'

export function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const { data: sections = [], isLoading: sectionsLoading } = useSections(projectId)
  const { data: unsectionedTasks = [], isLoading: tasksLoading } = useTasks({ projectId, noSection: true })

  const navigate = useNavigate()
  const { data: allProjects = [] } = useProjects()
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()
  const archiveProject = useArchiveProject()
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [moveParentId, setMoveParentId] = useState<string>('')
  const [addingTaskToSection, setAddingTaskToSection] = useState<string | null>(null) // section id or 'none'
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [dangerVisible, setDangerVisible] = useState(false)
  const dangerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDangerVisible(false)
    const el = dangerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setDangerVisible(true) },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [projectId])

  const isLoading = projectLoading || sectionsLoading || tasksLoading

  if (isLoading) {
    return (
      <MainPanel title="Loading...">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-500" />
        </div>
      </MainPanel>
    )
  }

  if (!project) {
    return (
      <MainPanel title="Project not found">
        <div className="text-center py-12 text-gray-500">
          This project doesn't exist or you don't have access to it.
        </div>
      </MainPanel>
    )
  }

  return (
    <MainPanel title={project.name}>
      <div className="max-w-2xl mx-auto">
        {/* Project header with description and organize */}
        <ProjectHeader project={project} sections={sections} />

        {/* Unsectioned tasks */}
        {unsectionedTasks.length > 0 && (
          <div className="mb-6">
            <TaskList
              tasks={unsectionedTasks}
              onTaskClick={(task) => setEditingTask(task)}
            />
          </div>
        )}

        {/* Add task to project (unsectioned) */}
        {addingTaskToSection === 'none' ? (
          <div className="mb-6">
            <TaskEditor
              defaultProjectId={projectId}
              onClose={() => setAddingTaskToSection(null)}
            />
          </div>
        ) : (
          <button
            onClick={() => setAddingTaskToSection('none')}
            className="mb-6 flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-accent-600 transition-colors"
          >
            <PlusIcon />
            <span>Add task</span>
          </button>
        )}

        {/* Sections */}
        {sections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            projectId={projectId!}
            setEditingTask={setEditingTask}
            addingTaskToSection={addingTaskToSection}
            setAddingTaskToSection={setAddingTaskToSection}
          />
        ))}

        {/* Editing task overlay */}
        {editingTask && (
          <div className="mt-4">
            <TaskEditor
              task={editingTask}
              defaultProjectId={projectId}
              onClose={() => setEditingTask(null)}
            />
          </div>
        )}

        {/* Spacer — pushes danger zone well below the fold */}
        <div className="h-[60vh]" />

        {/* Project color */}
        <div className="mb-6 border border-gray-200 rounded-lg bg-gray-50/50 p-4">
          <h3 className="text-sm font-semibold text-gray-700">Project color</h3>
          <div className="mt-3 flex gap-2">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  if (c === project.color) return
                  updateProject.mutate({ id: projectId!, color: c })
                }}
                className={`w-8 h-8 rounded-full transition-transform ${
                  project.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Move project section */}
        <MoveProjectSection
          project={project}
          allProjects={allProjects}
          moveParentId={moveParentId}
          setMoveParentId={setMoveParentId}
          onMove={(newParentId) => {
            const name = project.name
            updateProject.mutate({ id: projectId!, parent_id: newParentId }, {
              onSuccess: () => {
                toast(`Moved "${name}"`)
                setMoveParentId('')
              },
            })
          }}
          isPending={updateProject.isPending}
        />

        {/* Archive section */}
        <div className="mb-6 border border-gray-200 rounded-lg bg-gray-50/50 p-4">
          <h3 className="text-sm font-semibold text-gray-700">Archive project</h3>
          <p className="mt-1 text-sm text-gray-500">
            Move this project to the archive. You can restore it later from the Archive view.
          </p>
          <button
            onClick={() => {
              const name = project.name
              archiveProject.mutate(projectId!, {
                onSuccess: () => {
                  toast(`"${name}" archived`)
                  navigate('/inbox')
                },
              })
            }}
            disabled={archiveProject.isPending}
            className="mt-3 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Archive project
          </button>
        </div>

        {/* Danger zone — fades in on scroll */}
        <div
          ref={dangerRef}
          className={`mb-8 border border-red-200 rounded-lg bg-red-50/50 p-4 transition-opacity duration-500 ${dangerVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          <h3 className="text-sm font-semibold text-red-900">Danger zone</h3>
          <p className="mt-1 text-sm text-red-700/70">
            Permanently delete this project, its sections, and all child projects. Tasks will be moved to Inbox.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="mt-3 px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-100 transition-colors"
          >
            Delete project
          </button>
        </div>

        <ConfirmDeleteModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={() => {
            const deletedName = project.name
            deleteProject.mutate(projectId!, {
              onSuccess: () => {
                setShowDeleteModal(false)
                toast(`Project "${deletedName}" deleted`)
                navigate('/inbox')
              },
            })
          }}
          title="Delete project"
          itemName={project.name}
          description="All sections and child projects will be deleted. Tasks will be moved to Inbox."
          isPending={deleteProject.isPending}
        />
      </div>
    </MainPanel>
  )
}

interface SectionBlockProps {
  section: Section
  projectId: string
  setEditingTask: (task: Task | null) => void
  addingTaskToSection: string | null
  setAddingTaskToSection: (id: string | null) => void
}

function SectionBlock({
  section,
  projectId,
  setEditingTask,
  addingTaskToSection,
  setAddingTaskToSection,
}: SectionBlockProps) {
  const { data: tasks = [] } = useTasks({ sectionId: section.id })
  const deleteSection = useDeleteSection()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div id={`section-${section.id}`} className="mb-6 scroll-mt-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-2 group">
        <h3 className="font-semibold text-gray-900">{section.name}</h3>
        <span className="text-xs text-gray-400">{tasks.length}</span>
        <div className="relative ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <MoreIcon />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[120px]">
                <button
                  onClick={() => {
                    if (confirm('Delete this section? Tasks will be moved to unsectioned.')) {
                      deleteSection.mutate({ id: section.id, projectId })
                    }
                    setShowMenu(false)
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Delete section
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tasks in this section */}
      <TaskList
        tasks={tasks}
        onTaskClick={(task) => setEditingTask(task)}
        emptyMessage=""
      />

      {/* Add task to section */}
      {addingTaskToSection === section.id ? (
        <div className="mt-2">
          <TaskEditor
            defaultProjectId={projectId}
            defaultSectionId={section.id}
            onClose={() => setAddingTaskToSection(null)}
          />
        </div>
      ) : (
        <button
          onClick={() => setAddingTaskToSection(section.id)}
          className="mt-2 flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-accent-600 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add task</span>
        </button>
      )}
    </div>
  )
}

function PlusIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  )
}

interface MoveProjectSectionProps {
  project: { id: string; name: string; parent_id: string | null }
  allProjects: import('@/types').Project[]
  moveParentId: string
  setMoveParentId: (id: string) => void
  onMove: (newParentId: string | null) => void
  isPending: boolean
}

function MoveProjectSection({ project, allProjects, moveParentId, setMoveParentId, onMove, isPending }: MoveProjectSectionProps) {
  const descendants = getDescendantIds(allProjects, project.id)
  const validTargets = allProjects.filter(p => p.id !== project.id && !descendants.has(p.id))
  const currentParent = allProjects.find(p => p.id === project.parent_id)

  const selectedValue = moveParentId || (project.parent_id ?? '__none__')
  const newParentId = moveParentId === '__none__' ? null : moveParentId || null
  const hasChanged = moveParentId !== '' && newParentId !== project.parent_id

  return (
    <div className="mb-6 border border-gray-200 rounded-lg bg-gray-50/50 p-4">
      <h3 className="text-sm font-semibold text-gray-700">Move project</h3>
      <p className="mt-1 text-sm text-gray-500">
        {currentParent
          ? <>Currently inside <span className="font-medium text-gray-700">{currentParent.name}</span></>
          : 'Currently a top-level project'}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <select
          value={selectedValue}
          onChange={(e) => setMoveParentId(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
        >
          <option value="__none__">None (top-level)</option>
          {validTargets.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          onClick={() => onMove(newParentId)}
          disabled={!hasChanged || isPending}
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Move
        </button>
      </div>
    </div>
  )
}
