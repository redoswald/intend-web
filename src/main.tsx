import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/contexts/AuthContext'
import App from './App'
import './index.css'

// One-time migration: old opus-* localStorage keys → intend-* after rename.
const sidebarWidth = localStorage.getItem('opus-sidebar-width')
if (sidebarWidth !== null && localStorage.getItem('intend-sidebar-width') === null) {
  localStorage.setItem('intend-sidebar-width', sidebarWidth)
  localStorage.removeItem('opus-sidebar-width')
}
const subtasksExpanded = localStorage.getItem('opus-subtasks-expanded')
if (subtasksExpanded !== null && localStorage.getItem('intend-subtasks-expanded') === null) {
  localStorage.setItem('intend-subtasks-expanded', subtasksExpanded)
  localStorage.removeItem('opus-subtasks-expanded')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
)
