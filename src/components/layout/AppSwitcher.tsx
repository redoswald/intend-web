import { useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'

export function AppSwitcher() {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate('/inbox')}
      className="flex items-center gap-2 w-full p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors"
    >
      <Zap className="w-5 h-5 text-accent-500" />
      <span className="text-sm font-semibold text-gray-900">Intend</span>
    </button>
  )
}
