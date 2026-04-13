import { useState } from 'react'
import { Users, Link2, Copy, X, Check, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import {
  useProjectShares,
  useUpdateSharePermission,
  useRemoveShare,
  useCreateShareLink,
  useProjectShareLinks,
  useRevokeShareLink,
} from '@/hooks/useSharing'
import { useProjects, getDescendantIds } from '@/hooks/useProjects'
import { IncludeChildrenDialog } from './IncludeChildrenDialog'
import type { SharePermission, Project } from '@/types'

const PERMISSION_LABELS: Record<SharePermission, string> = {
  view: 'Can view',
  edit: 'Can edit',
  admin: 'Admin',
}

interface ShareSectionProps {
  projectId: string
  project: Project
}

export function ShareSection({ projectId, project }: ShareSectionProps) {
  const { user } = useAuth()
  const { data: shares = [] } = useProjectShares(projectId)
  const { data: shareLinks = [] } = useProjectShareLinks(projectId)
  const { data: allProjects = [] } = useProjects()
  const updatePermission = useUpdateSharePermission()
  const removeShare = useRemoveShare()
  const createShareLink = useCreateShareLink()
  const revokeShareLink = useRevokeShareLink()

  const [linkPermission, setLinkPermission] = useState<SharePermission>('view')
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)

  // Include-children dialog state
  const [childrenDialog, setChildrenDialog] = useState<{
    permission: SharePermission
  } | null>(null)

  const isOwner = project.owner_id === user?.id
  const currentUserShare = shares.find(s => s.shared_with_user_id === user?.id)
  const canManage = isOwner || currentUserShare?.permission === 'admin'
  const childProjects = allProjects.filter(p => p.parent_id === projectId)

  function handleCreateLink(permission: SharePermission) {
    if (childProjects.length > 0) {
      setChildrenDialog({ permission })
    } else {
      doCreateLink(permission)
    }
  }

  function doCreateLink(permission: SharePermission) {
    createShareLink.mutate({ projectId, permission }, {
      onSuccess: (link) => {
        const url = `${window.location.origin}/share/${link.token}`
        navigator.clipboard.writeText(url)
        toast('Share link created and copied to clipboard')
      },
    })
  }

  function copyLink(token: string, linkId: string) {
    const url = `${window.location.origin}/share/${token}`
    navigator.clipboard.writeText(url)
    setCopiedLinkId(linkId)
    setTimeout(() => setCopiedLinkId(null), 2000)
  }

  return (
    <>
      <div id="sharing" className="mb-6 border border-gray-200 rounded-lg bg-gray-50/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Sharing</h3>
        </div>

        {/* Collaborator list */}
        <div className="space-y-2 mb-4">
          {/* Owner */}
          <div className="flex items-center gap-3 py-1.5">
            <UserAvatar name={user?.id === project.owner_id ? 'You' : 'Owner'} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.id === project.owner_id ? 'You' : 'Project owner'}
              </p>
            </div>
            <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded">Owner</span>
          </div>

          {/* Shared users */}
          {shares.map((share) => (
            <div key={share.id} className="flex items-center gap-3 py-1.5">
              <UserAvatar name={share.user?.display_name ?? 'User'} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {share.shared_with_user_id === user?.id ? 'You' : share.user?.display_name ?? 'Unknown user'}
                </p>
              </div>
              {canManage ? (
                <div className="flex items-center gap-1">
                  <PermissionSelect
                    value={share.permission}
                    onChange={(perm) => updatePermission.mutate({
                      shareId: share.id,
                      projectId,
                      permission: perm,
                    })}
                  />
                  <button
                    onClick={() => removeShare.mutate({ shareId: share.id, projectId })}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove access"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded">
                  {PERMISSION_LABELS[share.permission]}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Share links (only for owner/admin) */}
        {canManage && (
          <div className="border-t border-gray-200 pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-3.5 h-3.5 text-gray-500" />
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Share links</h4>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Create a link to share this project. Anyone with the link and an account can join.
            </p>

            {/* Existing links */}
            {shareLinks.map((link) => (
              <div key={link.id} className="flex items-center gap-2 py-1.5 text-sm">
                <span className="flex-1 text-gray-500 truncate text-xs font-mono">
                  .../share/{link.token.slice(0, 8)}...
                </span>
                <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">
                  {PERMISSION_LABELS[link.permission]}
                </span>
                <button
                  onClick={() => copyLink(link.token, link.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Copy link"
                >
                  {copiedLinkId === link.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => revokeShareLink.mutate({ linkId: link.id, projectId })}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Revoke link"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Create new link */}
            <div className="flex items-center gap-2 mt-2">
              <PermissionSelect value={linkPermission} onChange={setLinkPermission} />
              <button
                onClick={() => handleCreateLink(linkPermission)}
                disabled={createShareLink.isPending}
                className="px-3 py-1.5 text-sm font-medium text-accent-600 border border-accent-300 rounded-md hover:bg-accent-50 transition-colors disabled:opacity-50"
              >
                Create link
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Include children dialog */}
      <IncludeChildrenDialog
        isOpen={childrenDialog !== null}
        childCount={childProjects.length}
        onClose={() => setChildrenDialog(null)}
        onConfirm={(includeChildren) => {
          if (!childrenDialog) return
          doCreateLink(childrenDialog.permission)
          if (includeChildren) {
            const descendants = getDescendantIds(allProjects, projectId)
            descendants.forEach(pid => {
              createShareLink.mutate({ projectId: pid, permission: childrenDialog.permission })
            })
          }
          setChildrenDialog(null)
        }}
      />
    </>
  )
}

// --- Sub-components ---

function PermissionSelect({
  value,
  onChange,
}: {
  value: SharePermission
  onChange: (perm: SharePermission) => void
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SharePermission)}
        className="appearance-none pl-2 pr-6 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 cursor-pointer"
      >
        <option value="view">Can view</option>
        <option value="edit">Can edit</option>
        <option value="admin">Admin</option>
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
    </div>
  )
}

function UserAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase()

  return (
    <div className="w-8 h-8 text-xs rounded-full bg-accent-100 text-accent-700 flex items-center justify-center font-medium flex-shrink-0">
      {initial}
    </div>
  )
}
