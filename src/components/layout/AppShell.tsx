import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { MaestroDrawer } from '../maestro/MaestroDrawer'
import { CommandPalette, useCommandPalette } from './CommandPalette'
import { useSidebarResize } from '@/hooks/useSidebarResize'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [maestroOpen, setMaestroOpen] = useState(false)
  const commandPalette = useCommandPalette()
  const sidebar = useSidebarResize()
  const navigate = useNavigate()
  useRealtimeSync()

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        width={sidebar.width}
        isCollapsed={sidebar.isCollapsed}
        isDragging={sidebar.isDragging}
        dragHandleProps={sidebar.dragHandleProps}
        onOpenMaestro={() => {
          setSidebarOpen(false)
          setMaestroOpen(true)
        }}
      />

      {/* Main content area - scrolls independently */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header + desktop collapsed expand button */}
        <div className={`md:hidden flex items-center gap-4 p-4 border-b border-gray-200 flex-shrink-0 ${sidebar.isCollapsed ? '!flex' : ''}`}>
          <button
            onClick={() => {
              if (sidebar.isCollapsed) {
                sidebar.expand()
              } else {
                setSidebarOpen(true)
              }
            }}
            className="p-2 -m-2 text-gray-600 hover:text-gray-900"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-gray-900">Intend</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>

      {/* Maestro AI Drawer */}
      <MaestroDrawer
        isOpen={maestroOpen}
        onClose={() => setMaestroOpen(false)}
        onOpenSettings={() => {
          setMaestroOpen(false)
          navigate('/settings')
        }}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        onOpenMaestro={() => {
          commandPalette.close()
          setMaestroOpen(true)
        }}
      />
    </div>
  )
}
