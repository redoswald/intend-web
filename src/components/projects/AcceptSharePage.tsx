import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAcceptShareLink } from '@/hooks/useSharing'
import { MainPanel } from '@/components/layout/MainPanel'

export function AcceptSharePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const acceptLink = useAcceptShareLink()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('No share token provided')
      return
    }

    acceptLink.mutate({ token }, {
      onSuccess: (projectId) => {
        navigate(`/project/${projectId}`, { replace: true })
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : 'Failed to accept share link')
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (error) {
    return (
      <MainPanel title="Share link">
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Invalid or expired link</h2>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => navigate('/inbox')}
            className="px-4 py-2 text-sm font-medium text-white bg-accent-500 rounded-md hover:bg-accent-600 transition-colors"
          >
            Go to Inbox
          </button>
        </div>
      </MainPanel>
    )
  }

  return (
    <MainPanel title="Accepting share...">
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-500" />
      </div>
    </MainPanel>
  )
}
