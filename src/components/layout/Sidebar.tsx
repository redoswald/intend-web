import { useState, useRef, useCallback } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Inbox,
  CalendarCheck,
  CalendarDays,
  CircleCheck,
  Archive,
  Plus,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useProjects, useUpdateProject, useDeleteProject, useArchiveProject, useUnarchiveProject, useReorderProject, buildProjectTree, getDescendantIds, computeReorder } from '@/hooks/useProjects'
import { useInboxCount, useTodayCount, useUpdateTask } from '@/hooks/useTasks'
import { ProjectContextMenu } from '@/components/shared/ProjectContextMenu'
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal'
import { AppSwitcher } from './AppSwitcher'
import { AccountMenu } from './AccountMenu'
import type { Project } from '@/types'

interface DragIndicator {
  targetId: string
  zone: 'above' | 'nest' | 'below'
  promote: boolean
  depth: number
}

interface ProjectDropParams {
  draggedId: string
  targetId: string
  zone: 'above' | 'nest' | 'below'
  promote: boolean
  depth: number
}

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
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()
  const archiveProject = useArchiveProject()
  const unarchiveProject = useUnarchiveProject()
  const reorderProject = useReorderProject()

  const projectTree = buildProjectTree(projects)

  // Drag indicator state for project reorder
  const [dragIndicator, setDragIndicator] = useState<DragIndicator | null>(null)
  const draggedIdRef = useRef<string | null>(null)

  // Context menu + delete modal state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [moveTarget, setMoveTarget] = useState<Project | null>(null)
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null)

  function handleProjectContextMenu(project: Project, position: { x: number; y: number }) {
    setContextMenu(position)
    setDeleteTarget(project)
  }

  function handleContextMenuDelete() {
    setContextMenu(null)
    setShowDeleteModal(true)
  }

  function handleContextMenuMove() {
    setContextMenu(null)
    setMoveTarget(deleteTarget)
    setDeleteTarget(null)
  }

  function handleContextMenuRename() {
    if (!deleteTarget) return
    setRenameTargetId(deleteTarget.id)
    setContextMenu(null)
    setDeleteTarget(null)
  }

  function handleRenameProject(id: string, newName: string) {
    setRenameTargetId(null)
    if (!newName.trim()) return
    const project = projects.find(p => p.id === id)
    if (!project || project.name === newName.trim()) return
    updateProject.mutate({ id, name: newName.trim() })
  }

  function handleProjectDrop(params: ProjectDropParams) {
    const { draggedId, targetId, zone, promote } = params
    const descendants = getDescendantIds(projects, draggedId)
    if (draggedId === targetId || descendants.has(targetId)) return
    const draggedProject = projects.find(p => p.id === draggedId)
    if (!draggedProject) return
    const targetProject = projects.find(p => p.id === targetId)
    if (!targetProject) return

    if (zone === 'nest') {
      // Nest under target — put at end of target's children
      const childCount = projects.filter(p => p.parent_id === targetId).length
      reorderProject.mutate([{
        id: draggedId,
        sort_order: childCount,
        parent_id: targetId,
      }], {
        onSuccess: () => toast(`Moved "${draggedProject.name}"`),
      })
    } else {
      // above/below — compute new parent
      let newParentId: string | null
      if (promote) {
        // Promote: go to target's grandparent level
        const targetParent = projects.find(p => p.id === targetProject.parent_id)
        newParentId = targetParent?.parent_id ?? null
      } else {
        newParentId = targetProject.parent_id
      }

      const updates = computeReorder(projects, draggedId, targetId, zone, newParentId)
      if (updates.length === 0) return

      reorderProject.mutate(updates, {
        onSuccess: () => toast(`Moved "${draggedProject.name}"`),
      })
    }
  }

  function handleProjectDropToRoot(draggedId: string) {
    const draggedProject = projects.find(p => p.id === draggedId)
    if (!draggedProject) return
    if (draggedProject.parent_id === null) return
    const rootCount = projects.filter(p => p.parent_id === null && p.id !== draggedId).length
    reorderProject.mutate([{
      id: draggedId,
      sort_order: rootCount,
      parent_id: null,
    }], {
      onSuccess: () => toast(`Moved "${draggedProject.name}"`),
    })
  }

  function handleDragEnd() {
    setDragIndicator(null)
    draggedIdRef.current = null
  }

  function handleMoveProject(newParentId: string | null) {
    if (!moveTarget) return
    const target = moveTarget
    setMoveTarget(null)
    if (target.parent_id === newParentId) return
    updateProject.mutate({ id: target.id, parent_id: newParentId }, {
      onSuccess: () => {
        toast(`Moved "${target.name}"`)
      },
    })
  }

  function handleContextMenuArchive() {
    if (!deleteTarget) return
    const target = deleteTarget
    setContextMenu(null)
    archiveProject.mutate(target.id, {
      onSuccess: () => {
        toast(`"${target.name}" archived`, {
          action: {
            label: 'Undo',
            onClick: () => unarchiveProject.mutate(target.id),
          },
        })
        if (location.pathname === `/project/${target.id}`) {
          navigate('/inbox')
        }
      },
    })
    setDeleteTarget(null)
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
                <NavItem to="/archived" icon={<Archive className="w-[18px] h-[18px]" />} label="Archive" onClick={onClose} />
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
              <div className="mt-6" onDragEnd={handleDragEnd}>
                <ProjectsHeader onClose={onClose} onProjectDrop={handleProjectDropToRoot} />
                <div className="space-y-0.5">
                  {projectTree.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      depth={0}
                      onClick={onClose}
                      onTaskDrop={handleMoveToProject}
                      onProjectDrop={handleProjectDrop}
                      onContextMenu={handleProjectContextMenu}
                      renameTargetId={renameTargetId}
                      onRename={handleRenameProject}
                      onCancelRename={() => setRenameTargetId(null)}
                      dragIndicator={dragIndicator}
                      onDragIndicator={setDragIndicator}
                      draggedIdRef={draggedIdRef}
                    />
                  ))}
                </div>
              </div>
            </nav>
          </div>

          {/* Zone 3: Account Menu */}
          <AccountMenu
            displayName={profile?.display_name}
            email={user?.email}
            avatarUrl={profile?.avatar_url ?? user?.user_metadata?.avatar_url}
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
          currentColor={deleteTarget.color}
          onClose={() => setContextMenu(null)}
          onRename={handleContextMenuRename}
          onChangeColor={(color) => {
            updateProject.mutate({ id: deleteTarget.id, color })
            setContextMenu(null)
            setDeleteTarget(null)
          }}
          onMove={handleContextMenuMove}
          onArchive={handleContextMenuArchive}
          onDelete={handleContextMenuDelete}
        />
      )}

      {/* Move project modal */}
      {moveTarget && (
        <MoveProjectModal
          project={moveTarget}
          projects={projects}
          onMove={handleMoveProject}
          onClose={() => setMoveTarget(null)}
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
  onProjectDrop?: (params: ProjectDropParams) => void
  onContextMenu?: (project: Project, position: { x: number; y: number }) => void
  renameTargetId?: string | null
  onRename?: (id: string, newName: string) => void
  onCancelRename?: () => void
  dragIndicator?: DragIndicator | null
  onDragIndicator?: (indicator: DragIndicator | null) => void
  draggedIdRef?: React.MutableRefObject<string | null>
}

function ProjectItem({ project, depth, onClick, onTaskDrop, onProjectDrop, onContextMenu, renameTargetId, onRename, onCancelRename, dragIndicator, onDragIndicator, draggedIdRef }: ProjectItemProps) {
  const [expanded, setExpanded] = useState(true)
  const [isTaskDragOver, setIsTaskDragOver] = useState(false)
  const isRenaming = renameTargetId === project.id
  const [renameValue, setRenameValue] = useState(project.name)
  const hasChildren = project.children && project.children.length > 0
  const rowRef = useRef<HTMLDivElement>(null)

  // Is this the item currently being dragged?
  const isSelf = draggedIdRef?.current === project.id

  // Indicator state for this specific item
  const indicator = dragIndicator?.targetId === project.id ? dragIndicator : null

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

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/opus-project', JSON.stringify({ id: project.id, name: project.name }))
    e.dataTransfer.effectAllowed = 'move'
    if (draggedIdRef) draggedIdRef.current = project.id
  }

  function handleDragOver(e: React.DragEvent) {
    // Task drag — simple highlight
    if (e.dataTransfer.types.includes('application/opus-task')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setIsTaskDragOver(true)
      return
    }

    // Project drag — zone detection
    if (e.dataTransfer.types.includes('application/opus-project')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (isSelf) return

      const rect = rowRef.current?.getBoundingClientRect()
      if (!rect) return

      const y = e.clientY - rect.top
      const height = rect.height
      const ratio = y / height

      let zone: 'above' | 'nest' | 'below'
      if (ratio < 0.3) zone = 'above'
      else if (ratio > 0.7) zone = 'below'
      else zone = 'nest'

      // X-axis: promote detection — if cursor is left of the row's indent + 8px
      const rowLeft = rect.left + depth * 12
      const promote = depth > 0 && e.clientX < rowLeft + 8

      onDragIndicator?.({ targetId: project.id, zone, promote, depth })
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    setIsTaskDragOver(false)
    // Only clear indicator if we truly left (not entering a child)
    if (rowRef.current && !rowRef.current.contains(e.relatedTarget as Node)) {
      if (dragIndicator?.targetId === project.id) {
        onDragIndicator?.(null)
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsTaskDragOver(false)

    // Task drop
    const taskData = e.dataTransfer.getData('application/opus-task')
    if (taskData && onTaskDrop) {
      const { id } = JSON.parse(taskData)
      onTaskDrop(id, project.id)
      onDragIndicator?.(null)
      return
    }

    // Project drop — use the current indicator
    const projectData = e.dataTransfer.getData('application/opus-project')
    if (projectData && onProjectDrop && dragIndicator) {
      const { id } = JSON.parse(projectData)
      onProjectDrop({
        draggedId: id,
        targetId: dragIndicator.targetId,
        zone: dragIndicator.zone,
        promote: dragIndicator.promote,
        depth: dragIndicator.depth,
      })
    }
    onDragIndicator?.(null)
  }

  // Determine indicator indent depth for above/below lines
  const indicatorDepth = indicator && indicator.promote ? Math.max(0, depth - 1) : depth

  return (
    <div>
      {/* Above insertion line */}
      {indicator && indicator.zone === 'above' && !isSelf && (
        <div
          className="h-0.5 bg-accent-500 rounded-full"
          style={{ marginLeft: `${indicatorDepth * 12 + 20}px`, marginRight: '12px' }}
        />
      )}
      <div
        ref={rowRef}
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
        {isRenaming ? (
          <div className={cn('flex-1 flex items-center gap-2 px-2 py-0.5', !hasChildren && 'ml-5')}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRename?.(project.id, renameValue)
                if (e.key === 'Escape') { setRenameValue(project.name); onCancelRename?.() }
              }}
              onBlur={() => onRename?.(project.id, renameValue)}
              autoFocus
              className="flex-1 min-w-0 text-sm px-1 py-0.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
          </div>
        ) : (
          <NavLink
            to={`/project/${project.id}`}
            onClick={onClick}
            draggable
            onDragStart={handleDragStart}
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
                isTaskDragOver && 'ring-2 ring-accent-500 bg-accent-50',
                indicator && indicator.zone === 'nest' && !isSelf && 'ring-2 ring-accent-500 bg-accent-50',
                isSelf && 'opacity-40'
              )
            }
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <span className="truncate">{project.name}</span>
          </NavLink>
        )}
      </div>
      {/* Below insertion line */}
      {indicator && indicator.zone === 'below' && !isSelf && (
        <div
          className="h-0.5 bg-accent-500 rounded-full"
          style={{ marginLeft: `${indicatorDepth * 12 + 20}px`, marginRight: '12px' }}
        />
      )}
      {hasChildren && expanded && (
        <div>
          {project.children!.map((child) => (
            <ProjectItem
              key={child.id}
              project={child}
              depth={depth + 1}
              onClick={onClick}
              onTaskDrop={onTaskDrop}
              onProjectDrop={onProjectDrop}
              onContextMenu={onContextMenu}
              renameTargetId={renameTargetId}
              onRename={onRename}
              onCancelRename={onCancelRename}
              dragIndicator={dragIndicator}
              onDragIndicator={onDragIndicator}
              draggedIdRef={draggedIdRef}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectsHeader({ onClose, onProjectDrop }: { onClose: () => void; onProjectDrop: (draggedId: string) => void }) {
  const [isDragOver, setIsDragOver] = useState(false)

  function handleDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes('application/opus-project')) {
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
    const data = e.dataTransfer.getData('application/opus-project')
    if (data) {
      const { id } = JSON.parse(data)
      onProjectDrop(id)
    }
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 rounded-md transition-colors',
        isDragOver && 'ring-2 ring-accent-500 bg-accent-50'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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
  )
}

interface MoveProjectModalProps {
  project: Project
  projects: Project[]
  onMove: (parentId: string | null) => void
  onClose: () => void
}

function MoveProjectModal({ project, projects, onMove, onClose }: MoveProjectModalProps) {
  const descendants = getDescendantIds(projects, project.id)
  const validTargets = projects.filter(p => p.id !== project.id && !descendants.has(p.id))

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-80 max-h-[60vh] flex flex-col">
        <div className="px-4 pt-4 pb-2">
          <h3 className="font-semibold text-gray-900">Move "{project.name}"</h3>
          <p className="text-sm text-gray-500 mt-1">Select a new parent project</p>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <button
            onClick={() => onMove(null)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
              project.parent_id === null ? 'bg-accent-50 text-accent-600' : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            None (top-level)
          </button>
          {validTargets.map(p => (
            <button
              key={p.id}
              onClick={() => onMove(p.id)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2',
                project.parent_id === p.id ? 'bg-accent-50 text-accent-600' : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
              <span className="truncate">{p.name}</span>
            </button>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-gray-200">
          <button onClick={onClose} className="w-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}
