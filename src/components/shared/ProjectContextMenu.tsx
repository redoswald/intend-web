import { useEffect, useState } from 'react'
import { PROJECT_COLORS } from '@/lib/constants'

interface ProjectContextMenuProps {
  position: { x: number; y: number }
  currentColor?: string
  onClose: () => void
  onRename: () => void
  onMove: () => void
  onChangeColor: (color: string) => void
  onArchive: () => void
  onDelete: () => void
}

export function ProjectContextMenu({ position, currentColor, onClose, onRename, onMove, onChangeColor, onArchive, onDelete }: ProjectContextMenuProps) {
  const [showColors, setShowColors] = useState(false)

  // Clamp to viewport
  const menuWidth = 160
  const menuHeight = showColors ? 220 : 192
  const x = Math.min(position.x, window.innerWidth - menuWidth - 8)
  const y = Math.min(position.y, window.innerHeight - menuHeight - 8)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showColors) setShowColors(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, showColors])

  return (
    <>
      {/* Invisible backdrop */}
      <div className="fixed inset-0 z-50" onClick={onClose} />
      {/* Menu */}
      <div
        className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[160px]"
        style={{ left: x, top: y }}
      >
        <button
          onClick={() => {
            onRename()
            onClose()
          }}
          className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
        >
          Rename project
        </button>
        <button
          onClick={() => setShowColors(!showColors)}
          className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
        >
          <span>Change color</span>
          <svg className={`w-3 h-3 text-gray-400 transition-transform ${showColors ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {showColors && (
          <div className="px-3 py-2 flex flex-wrap gap-1.5">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  onChangeColor(c)
                  onClose()
                }}
                className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                  currentColor === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
        <button
          onClick={() => {
            onMove()
            onClose()
          }}
          className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
        >
          Move project
        </button>
        <button
          onClick={() => {
            onArchive()
            onClose()
          }}
          className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
        >
          Archive project
        </button>
        <button
          onClick={() => {
            onDelete()
            onClose()
          }}
          className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
        >
          Delete project
        </button>
      </div>
    </>
  )
}
