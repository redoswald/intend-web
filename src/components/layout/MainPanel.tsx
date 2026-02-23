interface MainPanelProps {
  title: string
  children: React.ReactNode
  actions?: React.ReactNode
}

export function MainPanel({ title, children, actions }: MainPanelProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 min-h-[64px]">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
