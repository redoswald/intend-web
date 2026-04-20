import { useState, useCallback, useEffect, useRef } from 'react'

interface UseSidebarResizeOptions {
  storageKey?: string
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
}

export function useSidebarResize({
  storageKey = 'intend-sidebar-width',
  defaultWidth = 240,
  minWidth = 288,
  maxWidth = 360,
}: UseSidebarResizeOptions = {}) {
  const [width, setWidth] = useState(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const parsed = Number(stored)
      if (!isNaN(parsed)) return parsed
    }
    return defaultWidth
  })

  const [isDragging, setIsDragging] = useState(false)
  const lastExpandedWidth = useRef(width || defaultWidth)

  const isCollapsed = width === 0

  // Keep track of last non-zero width for expand
  useEffect(() => {
    if (width > 0) {
      lastExpandedWidth.current = width
    }
  }, [width])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)

    const startX = e.clientX
    const startWidth = width || lastExpandedWidth.current

    function onMouseMove(e: MouseEvent) {
      const delta = e.clientX - startX
      let newWidth = startWidth + delta

      if (newWidth < minWidth) {
        // Snap to collapsed
        newWidth = 0
      } else {
        newWidth = Math.min(newWidth, maxWidth)
      }

      setWidth(newWidth)
    }

    function onMouseUp() {
      setIsDragging(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)

      // Persist to localStorage
      setWidth((current) => {
        localStorage.setItem(storageKey, String(current))
        return current
      })
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [width, minWidth, maxWidth, storageKey])

  const handleDoubleClick = useCallback(() => {
    setWidth(defaultWidth)
    localStorage.setItem(storageKey, String(defaultWidth))
  }, [defaultWidth, storageKey])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    setIsDragging(true)

    const startX = touch.clientX
    const startWidth = width || lastExpandedWidth.current

    function onTouchMove(e: TouchEvent) {
      const touch = e.touches[0]
      const delta = touch.clientX - startX
      let newWidth = startWidth + delta

      if (newWidth < minWidth) {
        newWidth = 0
      } else {
        newWidth = Math.min(newWidth, maxWidth)
      }

      setWidth(newWidth)
    }

    function onTouchEnd() {
      setIsDragging(false)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)

      setWidth((current) => {
        localStorage.setItem(storageKey, String(current))
        return current
      })
    }

    document.addEventListener('touchmove', onTouchMove)
    document.addEventListener('touchend', onTouchEnd)
  }, [width, minWidth, maxWidth, storageKey])

  const expand = useCallback(() => {
    const w = lastExpandedWidth.current || defaultWidth
    setWidth(w)
    localStorage.setItem(storageKey, String(w))
  }, [defaultWidth, storageKey])

  const collapse = useCallback(() => {
    setWidth(0)
    localStorage.setItem(storageKey, '0')
  }, [storageKey])

  return {
    width,
    isCollapsed,
    isDragging,
    dragHandleProps: {
      onMouseDown: handleMouseDown,
      onDoubleClick: handleDoubleClick,
      onTouchStart: handleTouchStart,
    },
    expand,
    collapse,
  }
}
