import { useState, useRef, useCallback } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Inbox,
  CalendarCheck,
  CalendarDays,
  CircleCheck,
  Plus,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useProjects, useDeleteProject, buildProjectTree } from '@/hooks/useProjects'
import { useInboxCount, useTodayCount, useUpdateTask } from '@/hooks/useTasks'
import { ProjectContextMenu } from '@/components/shared/ProjectContextMenu'
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal'
import { AppSwitcher } from './AppSwitcher'
import { AccountMenu } from './AccountMenu'
import type { Project } from '@/types'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  width: number
  isCollapsed: boolean
  isDragging: boolean
  dragHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void
    onDoubleClick: () => void
    onTouchStart: (e: React.TouchEvent) => void
  }
  onOpenMaestro: () => void
  onOpenSettings: () => void
}

export function Sidebar({
  isOpen,
  onClose,
  width,
  isCollapsed,
  isDragging,
  dragHandleProps,
  onOpenMaestro,
  onOpenSettings,
}: SidebarProps) {
  const { user, profile, signOut } = useAuth()
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
    const deletedName = deleteTarget.name
    deleteProject.mutate(deletedId, {
      onSuccess: () => {
        setShowDeleteModal(false)
        setDeleteTarget(null)
        toast(`Project "${deletedName}" deleted`)
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
      section_id: null,
    })
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-30 w-72 md:w-[var(--sidebar-w)] h-full bg-white border-r border-gray-200 flex flex-col flex-shrink-0',
          !isDragging && 'transition-transform md:transition-[width] md:duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          isCollapsed && 'md:overflow-hidden md:border-r-0'
        )}
        style={{ '--sidebar-w': `${width}px` } as React.CSSProperties}
      >
        <div className="flex flex-col h-full min-w-[theme(width.72)]">
          {/* Zone 1: App Switcher */}
          <AppSwitcher />

          {/* Zone 2: Navigation (scrollable) */}
          <div className="flex-1 overflow-y-auto">
            {/* Quick add */}
            <div className="p-3">
              <button
                onClick={() => {
                  navigate('/inbox?add=true')
                  onClose()
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-accent-600 hover:bg-accent-50 rounded-md transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add task</span>
              </button>
            </div>

            <nav className="px-3 pb-4">
              <div className="space-y-1">
                <NavItem to="/inbox" icon={<Inbox className="w-[18px] h-[18px]" />} label="Inbox" count={inboxCount} onClick={onClose} onTaskDrop={handleMoveToInbox} />
                <NavItem to="/today" icon={<CalendarCheck className="w-[18px] h-[18px]" />} label="Today" count={todayCount} onClick={onClose} />
                <NavItem to="/upcoming" icon={<CalendarDays className="w-[18px] h-[18px]" />} label="Upcoming" onClick={onClose} />
                <NavItem to="/completed" icon={<CircleCheck className="w-[18px] h-[18px]" />} label="Completed" onClick={onClose} />
              </div>

              {/* Maestro */}
              <div className="mt-3">
                <button
                  onClick={onOpenMaestro}
                  className="flex items-center gap-3 w-full px-3 py-2 text-accent-600 hover:bg-accent-50 rounded-md transition-colors"
                >
                  <Sparkles className="w-[18px] h-[18px]" />
                  <span className="font-medium">Maestro</span>
                </button>
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
                    <Plus className="w-4 h-4" />
                  </NavLink>
                </div>
                <div className="space-y-0.5">
                  {projectTree.map((project) => (
                    <ProjectItem key={project.id} project={project} depth={0} onClick={onClose} onTaskDrop={handleMoveToProject} onContextMenu={handleProjectContextMenu} />
                  ))}
                </div>
              </div>
            </nav>
          </div>

          {/* Zone 3: Account Menu */}
          <AccountMenu
            displayName={profile?.display_name}
            email={user?.email}
            onOpenSettings={onOpenSettings}
            onSignOut={handleSignOut}
          />
        </div>

        {/* Drag handle — desktop only */}
        <div
          className="hidden md:block absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-gray-300 active:bg-gray-400 transition-colors z-10"
          {...dragHandleProps}
        />
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
            ? 'bg-accent-50 text-accent-600'
            : 'text-gray-700 hover:bg-gray-200',
          isDragOver && 'ring-2 ring-accent-500 bg-accent-50'
        )
      }
    >
      <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
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
            <ChevronRight className={cn('w-3 h-3 transition-transform', expanded && 'rotate-90')} />
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
                ? 'bg-accent-50 text-accent-600'
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
