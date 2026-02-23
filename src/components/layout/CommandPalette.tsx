import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useProjects } from '@/hooks/useProjects'
import type { Project } from '@/types'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchItem {
  id: string
  type: 'view' | 'project'
  name: string
  path: string
  color?: string
  icon?: React.ReactNode
}

const BUILT_IN_VIEWS: SearchItem[] = [
  { id: 'inbox', type: 'view', name: 'Inbox', path: '/inbox', icon: <InboxIcon /> },
  { id: 'today', type: 'view', name: 'Today', path: '/today', icon: <TodayIcon /> },
  { id: 'upcoming', type: 'view', name: 'Upcoming', path: '/upcoming', icon: <CalendarIcon /> },
  { id: 'completed', type: 'view', name: 'Completed', path: '/completed', icon: <CheckCircleIcon /> },
  { id: 'add', type: 'view', name: 'Add Task', path: '/add', icon: <PlusIcon /> },
]

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { data: projects = [] } = useProjects()

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

  // Filter items based on query
  const filteredItems = useMemo(() => {
    const allItems = [...BUILT_IN_VIEWS, ...projectItems]
    if (!query.trim()) {
      return allItems
    }
    const lowerQuery = query.toLowerCase()
    return allItems.filter(item =>
      item.name.toLowerCase().includes(lowerQuery)
    )
  }, [query, projectItems])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      // Small delay to ensure modal is rendered
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
    navigate(item.path)
    onClose()
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
            <SearchIcon />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search projects and views..."
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
                {/* Views section */}
                {filteredItems.some(item => item.type === 'view') && (
                  <>
                    <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Views
                    </div>
                    {filteredItems
                      .filter(item => item.type === 'view')
                      .map((item) => {
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
                  </>
                )}

                {/* Projects section */}
                {filteredItems.some(item => item.type === 'project') && (
                  <>
                    <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">
                      Projects
                    </div>
                    {filteredItems
                      .filter(item => item.type === 'project')
                      .map((item) => {
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
                  </>
                )}
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
  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
        isSelected ? 'bg-accent-50 text-accent-700' : 'text-gray-700 hover:bg-gray-50'
      )}
    >
      {item.type === 'view' ? (
        <span className="w-5 h-5 text-gray-500">{item.icon}</span>
      ) : (
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: item.color }}
        />
      )}
      <span className="flex-1 truncate">{item.name}</span>
      {isSelected && (
        <span className="text-xs text-accent-500">Go →</span>
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

// Icons
function SearchIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}
