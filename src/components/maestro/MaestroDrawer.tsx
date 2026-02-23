import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import Markdown from 'react-markdown'
import { useSettings } from '@/hooks/useSettings'
import { useMaestroContext } from '@/hooks/useMaestroContext'
import { useCreateTask, useUpdateTask, useCompleteTask, useDeleteTask } from '@/hooks/useTasks'
import { useCreateProject, useUpdateProject } from '@/hooks/useProjects'
import { chat, executeAction, type MaestroMessage, type PendingAction, type ActionExecutor } from '@/lib/maestro'

interface MaestroDrawerProps {
  isOpen: boolean
  onClose: () => void
  onOpenSettings: () => void
}

export function MaestroDrawer({ isOpen, onClose, onOpenSettings }: MaestroDrawerProps) {
  const { data: settings } = useSettings()
  const { data: context, refetch: refetchContext } = useMaestroContext()
  const [messages, setMessages] = useState<MaestroMessage[]>([])
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([])
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set())
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Mutation hooks for executing actions
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const completeTask = useCompleteTask()
  const deleteTask = useDeleteTask()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()

  const hasApiKey = !!settings?.anthropic_api_key

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Select all new actions by default
  useEffect(() => {
    if (pendingActions.length > 0) {
      setSelectedActions(new Set(pendingActions.map(a => a.id)))
    }
  }, [pendingActions])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading || !hasApiKey || !context) return

    const userMessage: MaestroMessage = {
      role: 'user',
      content: input.trim(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      // Refetch context to get latest data
      await refetchContext()

      const response = await chat(
        settings!.anthropic_api_key!,
        newMessages,
        context
      )

      const assistantMessage: MaestroMessage = {
        role: 'assistant',
        content: response.message,
      }
      setMessages([...newMessages, assistantMessage])

      if (response.pendingActions.length > 0) {
        setPendingActions(prev => [...prev, ...response.pendingActions])
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err instanceof Error ? err.message : 'Failed to get response')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleApproveActions() {
    const actionsToExecute = pendingActions.filter(a => selectedActions.has(a.id))
    if (actionsToExecute.length === 0) return

    const executor: ActionExecutor = {
      createTask: async (payload) => {
        await createTask.mutateAsync({
          title: payload.title as string,
          description: payload.description as string | undefined,
          project_id: payload.project_id as string | undefined,
          due_date: payload.due_date as string | undefined,
          priority: payload.priority as number | undefined,
        })
      },
      updateTask: async (payload) => {
        const { task_id, ...updates } = payload
        await updateTask.mutateAsync({ id: task_id as string, ...updates })
      },
      completeTask: async (taskId) => {
        await completeTask.mutateAsync(taskId)
      },
      deleteTask: async (taskId) => {
        await deleteTask.mutateAsync(taskId)
      },
      createProject: async (payload) => {
        await createProject.mutateAsync({
          name: payload.name as string,
          description: payload.description as string | undefined,
          color: payload.color as string | undefined,
        })
      },
      archiveProject: async (projectId) => {
        await updateProject.mutateAsync({ id: projectId, is_archived: true })
      },
    }

    for (const action of actionsToExecute) {
      try {
        await executeAction(action, executor)
      } catch (err) {
        console.error('Failed to execute action:', err)
      }
    }

    // Remove executed actions
    setPendingActions(prev => prev.filter(a => !selectedActions.has(a.id)))
    setSelectedActions(new Set())

    // Refresh context
    refetchContext()
  }

  function handleClearActions() {
    setPendingActions([])
    setSelectedActions(new Set())
  }

  function toggleAction(actionId: string) {
    setSelectedActions(prev => {
      const next = new Set(prev)
      if (next.has(actionId)) {
        next.delete(actionId)
      } else {
        next.add(actionId)
      }
      return next
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl flex flex-col transition-transform duration-300',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MaestroIcon />
            <h2 className="font-semibold text-gray-900">Maestro</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!hasApiKey ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MaestroIcon className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">Set up Maestro</h3>
              <p className="text-sm text-gray-500 mb-4">
                Add your Anthropic API key to start chatting with Maestro.
              </p>
              <button
                onClick={onOpenSettings}
                className="px-4 py-2 bg-accent-600 text-white rounded-md hover:bg-accent-700 transition-colors"
              >
                Open Settings
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MaestroIcon className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">Hi, I'm Maestro!</h3>
              <p className="text-sm text-gray-500">
                I can help you manage your tasks, review your portfolio, and plan your day.
              </p>
              <div className="mt-4 space-y-2">
                <SuggestionButton onClick={() => setInput('Do a portfolio review')}>
                  Do a portfolio review
                </SuggestionButton>
                <SuggestionButton onClick={() => setInput('Help me plan my day')}>
                  Help me plan my day
                </SuggestionButton>
                <SuggestionButton onClick={() => setInput("What's overdue?")}>
                  What's overdue?
                </SuggestionButton>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-4 py-2',
                      message.role === 'user'
                        ? 'bg-accent-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    )}
                  >
                    {message.role === 'assistant' ? (
                      <div className="text-sm prose prose-sm max-w-none">
                        <Markdown>{message.content}</Markdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <LoadingDots />
                  </div>
                </div>
              )}
              {error && (
                <div className="flex justify-center">
                  <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2">
                    {error}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Pending Actions */}
        {pendingActions.length > 0 && (
          <div className="border-t bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Pending Actions ({pendingActions.length})
              </span>
              <button
                onClick={handleClearActions}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {pendingActions.map(action => (
                <label
                  key={action.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedActions.has(action.id)}
                    onChange={() => toggleAction(action.id)}
                    className="rounded border-gray-300 text-accent-600 focus:ring-accent-500"
                  />
                  <span className="text-gray-700">{action.description}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleApproveActions}
              disabled={selectedActions.size === 0}
              className="mt-3 w-full px-4 py-2 bg-accent-600 text-white text-sm rounded-md hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Approve Selected ({selectedActions.size})
            </button>
          </div>
        )}

        {/* Input */}
        {hasApiKey && (
          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Maestro anything..."
                rows={1}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 bg-accent-600 text-white rounded-md hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SendIcon />
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}

function SuggestionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="block w-full text-left px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
    >
      {children}
    </button>
  )
}

function LoadingDots() {
  return (
    <div className="flex gap-1">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
    </div>
  )
}

function MaestroIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  )
}

export { MaestroIcon }
