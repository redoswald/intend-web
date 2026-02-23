import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { LoginPage } from '@/components/auth/LoginPage'
import { SignupPage } from '@/components/auth/SignupPage'
import { LandingPage } from '@/components/LandingPage'
import { AppShell } from '@/components/layout/AppShell'
import { InboxView } from '@/components/views/InboxView'
import { TodayView } from '@/components/views/TodayView'
import { UpcomingView } from '@/components/views/UpcomingView'
import { CompletedView } from '@/components/views/CompletedView'
import { ProjectView } from '@/components/projects/ProjectView'
import { NewProjectPage } from '@/components/projects/NewProjectPage'
import { Toaster } from '@/components/ui/sonner'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        {/* Public routes */}
        <Route index element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected routes */}
        <Route
          element={
            <AuthGuard>
              <AppShell />
            </AuthGuard>
          }
        >
          <Route path="/inbox" element={<InboxView />} />
          <Route path="/today" element={<TodayView />} />
          <Route path="/upcoming" element={<UpcomingView />} />
          <Route path="/completed" element={<CompletedView />} />
          <Route path="/project/:projectId" element={<ProjectView />} />
          <Route path="/projects/new" element={<NewProjectPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/inbox" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
