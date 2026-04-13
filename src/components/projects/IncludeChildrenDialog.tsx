interface IncludeChildrenDialogProps {
  isOpen: boolean
  childCount: number
  onClose: () => void
  onConfirm: (includeChildren: boolean) => void
}

export function IncludeChildrenDialog({
  isOpen,
  childCount,
  onClose,
  onConfirm,
}: IncludeChildrenDialogProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-accent-50 border-b border-accent-100 px-4 py-3 rounded-t-lg">
          <h2 className="text-lg font-semibold text-accent-900">Include sub-projects?</h2>
        </div>

        <div className="p-4">
          <p className="text-gray-700">
            This project has <span className="font-semibold">{childCount}</span> sub-project{childCount !== 1 ? 's' : ''}.
            Would you like to share them too?
          </p>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={() => onConfirm(false)}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Only this project
          </button>
          <button
            onClick={() => onConfirm(true)}
            className="px-4 py-2 bg-accent-500 text-white rounded-md hover:bg-accent-600 transition-colors"
          >
            Include children
          </button>
        </div>
      </div>
    </div>
  )
}
