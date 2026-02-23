import { useState, useRef, useCallback } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useProjects, useDeleteProject, buildProjectTree } from '@/hooks/useProjects'
import { useInboxCount, useTodayCount, useUpdateTask } from '@/hooks/useTasks'
import { ProjectContextMenu } from '@/components/shared/ProjectContextMenu'
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal'
import type { Project } from '@/types'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onOpenMaestro: () => void
  onOpenSettings: () => void
}

export function Sidebar({ isOpen, onClose, onOpenMaestro, onOpenSettings }: SidebarProps) {
  const { profile, signOut } = useAuth()
  const { data: projects = [] } = useProjects()
  const { data: inboxCount = 0 } = useInboxCount()
  const { data: todayCount = 0 } = useTodayCount()
  const navigate = useNavigate()
  const location = useLocation()
  const updateTask = useUpdateTask()
  const deleteProject = useDeleteProject()

  const projectTree = buildProjectTree(projects)

  // Context menu + delete modal state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  function handleProjectContextMenu(project: Project, position: { x: number; y: number }) {
    setContextMenu(position)
    setDeleteTarget(project)
  }

  function handleContextMenuDelete() {
    setContextMenu(null)
    setShowDeleteModal(true)
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    const deletedId = deleteTarget.id
    deleteProject.mutate(deletedId, {
      onSuccess: () => {
        setShowDeleteModal(false)
        setDeleteTarget(null)
        if (location.pathname === `/project/${deletedId}`) {
          navigate('/inbox')
        }
      },
    })
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  function handleMoveToInbox(taskId: string) {
    updateTask.mutate({
      id: taskId,
      project_id: null,
      section_id: null,
    })
  }

  function handleMoveToProject(taskId: string, projectId: string) {
    updateTask.mutate({
      id: taskId,
      project_id: projectId,
      section_id: null, // Clear section when moving to new project
    })
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-30 w-72 h-full bg-gray-100 border-r border-gray-200 flex flex-col transition-transform lg:transform-none flex-shrink-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* User info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center text-white font-medium">
              {profile?.display_name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <span className="font-medium text-gray-900 truncate">
              {profile?.display_name ?? 'Loading...'}
            </span>
          </div>
        </div>

        {/* Quick add */}
        <div className="p-3">
          <button
            onClick={() => {
              navigate('/inbox?add=true')
              onClose()
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-accent-600 hover:bg-accent-50 rounded-md transition-colors"
          >
            <PlusIcon />
            <span className="font-medium">Add task</span>
          </button>
        </div>

        {/* Navigation - scrolls independently */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="space-y-1">
            <NavItem to="/inbox" icon={<InboxIcon />} label="Inbox" count={inboxCount} onClick={onClose} onTaskDrop={handleMoveToInbox} />
            <NavItem to="/today" icon={<TodayIcon />} label="Today" count={todayCount} onClick={onClose} />
            <NavItem to="/upcoming" icon={<CalendarIcon />} label="Upcoming" onClick={onClose} />
            <NavItem to="/completed" icon={<CheckCircleIcon />} label="Completed" onClick={onClose} />
          </div>

          {/* Projects */}
          <div className="mt-6">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Projects
              </span>
              <NavLink
                to="/projects/new"
                className="text-gray-400 hover:text-gray-600"
                onClick={onClose}
              >
                <PlusIcon className="w-4 h-4" />
              </NavLink>
            </div>
            <div className="space-y-0.5">
              {projectTree.map((project) => (
                <ProjectItem key={project.id} project={project} depth={0} onClick={onClose} onTaskDrop={handleMoveToProject} onContextMenu={handleProjectContextMenu} />
              ))}
            </div>
          </div>
        </nav>

        {/* Footer actions */}
        <div className="p-3 border-t border-gray-200 space-y-1">
          <button
            onClick={onOpenMaestro}
            className="flex items-center gap-2 w-full px-3 py-2 text-accent-600 hover:bg-accent-50 rounded-md transition-colors"
          >
            <MaestroIcon />
            <span className="font-medium">Maestro</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 w-full px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
          >
            <SettingsIcon />
            <span>Settings</span>
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
          >
            <LogoutIcon />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Context menu */}
      {contextMenu && deleteTarget && (
        <ProjectContextMenu
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onDelete={handleContextMenuDelete}
        />
      )}

      {/* Delete confirmation modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setDeleteTarget(null)
        }}
        onConfirm={handleConfirmDelete}
        title="Delete project"
        itemName={deleteTarget?.name ?? ''}
        description="All sections and child projects will be deleted. Tasks will be moved to Inbox."
        isPending={deleteProject.isPending}
      />
    </>
  )
}

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
  count?: number
  onClick?: () => void
  onTaskDrop?: (taskId: string) => void
}

function NavItem({ to, icon, label, count, onClick, onTaskDrop }: NavItemProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  function handleDragOver(e: React.DragEvent) {
    if (!onTaskDrop) return
    if (e.dataTransfer.types.includes('application/opus-task')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setIsDragOver(true)
    }
  }

  function handleDragLeave() {
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    if (!onTaskDrop) return
    setIsDragOver(false)
    const data = e.dataTransfer.getData('application/opus-task')
    if (data) {
      const { id } = JSON.parse(data)
      onTaskDrop(id)
    }
  }

  return (
    <NavLink
      to={to}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
          isActive
            ? 'bg-accent-100 text-accent-700'
            : 'text-gray-700 hover:bg-gray-200',
          isDragOver && 'ring-2 ring-accent-500 bg-accent-50'
        )
      }
    >
      <span className="w-5 h-5">{icon}</span>
      <span className="flex-1">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-xs text-gray-500">{count}</span>
      )}
    </NavLink>
  )
}

interface ProjectItemProps {
  project: Project
  depth: number
  onClick?: () => void
  onTaskDrop?: (taskId: string, projectId: string) => void
  onContextMenu?: (project: Project, position: { x: number; y: number }) => void
}

function ProjectItem({ project, depth, onClick, onTaskDrop, onContextMenu }: ProjectItemProps) {
  const [expanded, setExpanded] = useState(true)
  const [isDragOver, setIsDragOver] = useState(false)
  const hasChildren = project.children && project.children.length > 0

  // Long-press support
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  function handleRightClick(e: React.MouseEvent) {
    e.preventDefault()
    onContextMenu?.(project, { x: e.clientX, y: e.clientY })
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
    longPressTimer.current = setTimeout(() => {
      onContextMenu?.(project, { x: touch.clientX, y: touch.clientY })
      longPressTimer.current = null
    }, 500)
  }, [project, onContextMenu])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!longPressTimer.current || !touchStart.current) return
    const touch = e.touches[0]
    const dx = touch.clientX - touchStart.current.x
    const dy = touch.clientY - touchStart.current.y
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  function handleDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes('application/opus-task')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setIsDragOver(true)
    }
  }

  function handleDragLeave() {
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const data = e.dataTransfer.getData('application/opus-task')
    if (data && onTaskDrop) {
      const { id } = JSON.parse(data)
      onTaskDrop(id, project.id)
    }
  }

  return (
    <div>
      <div
        className="flex items-center"
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <ChevronIcon className={cn('w-3 h-3 transition-transform', expanded && 'rotate-90')} />
          </button>
        )}
        <NavLink
          to={`/project/${project.id}`}
          onClick={onClick}
          onContextMenu={handleRightClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={({ isActive }) =>
            cn(
              'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors',
              isActive
                ? 'bg-accent-100 text-accent-700'
                : 'text-gray-700 hover:bg-gray-200',
              !hasChildren && 'ml-5',
              isDragOver && 'ring-2 ring-accent-500 bg-accent-50'
            )
          }
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <span className="truncate">{project.name}</span>
        </NavLink>
      </div>
      {hasChildren && expanded && (
        <div>
          {project.children!.map((child) => (
            <ProjectItem key={child.id} project={child} depth={depth + 1} onClick={onClick} onTaskDrop={onTaskDrop} onContextMenu={onContextMenu} />
          ))}
        </div>
      )}
    </div>
  )
}

// Icons
function PlusIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}

function InboxIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  )
}

function TodayIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}

function ChevronIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function MaestroIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
