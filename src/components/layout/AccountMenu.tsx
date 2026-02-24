import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AccountMenuProps {
  displayName: string | undefined
  email: string | undefined
  avatarUrl: string | null | undefined
  onSignOut: () => void
}

export function AccountMenu({ displayName, email, avatarUrl, onSignOut }: AccountMenuProps) {
  const navigate = useNavigate()
  const initial = displayName?.charAt(0).toUpperCase() ?? '?'
  const name = displayName ?? 'Loading...'

  return (
    <div className="p-3 border-t border-gray-200">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex-1 flex items-center gap-3 px-2 py-2 rounded-md hover:bg-gray-100 transition-colors min-w-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full flex-shrink-0" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                  {initial}
                </div>
              )}
              <span className="text-sm text-gray-700 truncate">{name}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            {email && (
              <>
                <div className="px-2 py-1.5 text-xs text-gray-500">{email}</div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              Account settings
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              Keyboard shortcuts
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={() => navigate('/settings')}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
