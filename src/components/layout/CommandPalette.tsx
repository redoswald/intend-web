import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Inbox,
  CalendarCheck,
  CalendarDays,
  CircleCheck,
  Archive,
  Plus,
  Sparkles,
  Settings,
  FolderPlus,
  CheckSquare,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { useProjects } from '@/hooks/useProjects'
import { useSearchTasks } from '@/hooks/useTasks'
import type { Project } from '@/types'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onOpenMaestro: () => void
  onOpenSettings: () => void
}

interface SearchItem {
  id: string
  type: 'view' | 'action' | 'project' | 'task'
  name: string
  path?: string
  action?: () => void
  color?: string
  icon?: React.ReactNode
  dueDate?: string | null
  projectName?: string
  projectColor?: string
}

const BUILT_IN_VIEWS: SearchItem[] = [
  { id: 'inbox', type: 'view', name: 'Inbox', path: '/inbox', icon: <Inbox className="w-5 h-5" /> },
  { id: 'today', type: 'view', name: 'Today', path: '/today', icon: <CalendarCheck className="w-5 h-5" /> },
  { id: 'upcoming', type: 'view', name: 'Upcoming', path: '/upcoming', icon: <CalendarDays className="w-5 h-5" /> },
  { id: 'completed', type: 'view', name: 'Completed', path: '/completed', icon: <CircleCheck className="w-5 h-5" /> },
  { id: 'archived', type: 'view', name: 'Archive', path: '/archived', icon: <Archive className="w-5 h-5" /> },
  { id: 'add', type: 'view', name: 'Add Task', path: '/inbox?add=true', icon: <Plus className="w-5 h-5" /> },
]

const SECTION_ORDER: SearchItem['type'][] = ['view', 'action', 'project', 'task']

const SECTION_LABELS: Record<string, string> = {
  view: 'Views',
  action: 'Actions',
  project: 'Projects',
  task: 'Tasks',
}

export function CommandPalette({ isOpen, onClose, onOpenMaestro, onOpenSettings }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { data: projects = [] } = useProjects()
  const { data: searchedTasks = [] } = useSearchTasks(debouncedQuery)

  // Debounce query for task search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  // Action commands
  const actionItems: SearchItem[] = useMemo(() => [
    { id: 'maestro', type: 'action', name: 'Open Maestro', icon: <Sparkles className="w-5 h-5" />, action: onOpenMaestro },
    { id: 'new-project', type: 'action', name: 'New Project', icon: <FolderPlus className="w-5 h-5" />, path: '/projects/new' },
    { id: 'settings', type: 'action', name: 'Settings', icon: <Settings className="w-5 h-5" />, action: onOpenSettings },
  ], [onOpenMaestro, onOpenSettings])

  // Flatten projects into search items
  const projectItems: SearchItem[] = useMemo(() => {
    const items: SearchItem[] = []
    function addProject(project: Project) {
      items.push({
        id: project.id,
        type: 'project',
        name: project.name,
        path: `/project/${project.id}`,
        color: project.color,
      })
      if (project.children) {
        project.children.forEach(addProject)
      }
    }
    projects.forEach(addProject)
    return items
  }, [projects])

  // Map searched tasks to search items
  const taskItems: SearchItem[] = useMemo(() => {
    return searchedTasks.map(task => ({
      id: task.id,
      type: 'task' as const,
      name: task.title,
      path: task.project_id ? `/project/${task.project_id}` : '/inbox',
      dueDate: task.due_date,
      projectName: task.project?.name,
      projectColor: task.project?.color,
      icon: <CheckSquare className="w-5 h-5" />,
    }))
  }, [searchedTasks])

  // Filter and combine items
  const filteredItems = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase()
    const hasQuery = lowerQuery.length > 0

    const views = hasQuery
      ? BUILT_IN_VIEWS.filter(v => v.name.toLowerCase().includes(lowerQuery))
      : BUILT_IN_VIEWS

    const actions = hasQuery
      ? actionItems.filter(a => a.name.toLowerCase().includes(lowerQuery))
      : actionItems

    const filteredProjects = hasQuery
      ? projectItems.filter(p => p.name.toLowerCase().includes(lowerQuery))
      : projectItems

    // Only show tasks when there's a query (otherwise too noisy)
    const tasks = hasQuery ? taskItems : []

    return [...views, ...actions, ...filteredProjects, ...tasks]
  }, [query, actionItems, projectItems, taskItems])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Focus input when opening, reset debounced query when closing
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setDebouncedQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [isOpen])

  // Handle keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }

  function handleSelect(item: SearchItem) {
    if (item.action) {
      item.action()
    } else if (item.path) {
      navigate(item.path)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
        <div
          className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search tasks, projects, and views..."
              className="flex-1 outline-none text-gray-900 placeholder-gray-400"
            />
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs text-gray-400 bg-gray-100 rounded">
              esc
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                No results found
              </div>
            ) : (
              <div className="py-2">
                {SECTION_ORDER.map(sectionType => {
                  const sectionItems = filteredItems.filter(item => item.type === sectionType)
                  if (sectionItems.length === 0) return null
                  return (
                    <div key={sectionType}>
                      <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2 first:mt-0">
                        {SECTION_LABELS[sectionType]}
                      </div>
                      {sectionItems.map(item => {
                        const globalIdx = filteredItems.indexOf(item)
                        return (
                          <ResultItem
                            key={item.id}
                            item={item}
                            isSelected={selectedIndex === globalIdx}
                            onSelect={() => handleSelect(item)}
                            onHover={() => setSelectedIndex(globalIdx)}
                          />
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500 flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600">↵</kbd>
              to select
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

interface ResultItemProps {
  item: SearchItem
  isSelected: boolean
  onSelect: () => void
  onHover: () => void
}

function ResultItem({ item, isSelected, onSelect, onHover }: ResultItemProps) {
  const selectionHint = item.action ? 'Run →' : 'Go →'

  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
        isSelected ? 'bg-accent-50 text-accent-700' : 'text-gray-700 hover:bg-gray-50'
      )}
    >
      {item.type === 'project' ? (
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: item.color }}
        />
      ) : (
        <span className="w-5 h-5 text-gray-500 flex-shrink-0">{item.icon}</span>
      )}
      <span className="flex-1 truncate">{item.name}</span>
      {item.type === 'task' && (
        <span className="flex items-center gap-2 flex-shrink-0">
          {item.projectName && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: item.projectColor }}
              />
              {item.projectName}
            </span>
          )}
          {item.dueDate && (
            <span className="text-xs text-gray-400">
              {format(parseISO(item.dueDate), 'MMM d')}
            </span>
          )}
        </span>
      )}
      {isSelected && (
        <span className="text-xs text-accent-500 flex-shrink-0">{selectionHint}</span>
      )}
    </button>
  )
}

// Global keyboard listener hook
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }
}
