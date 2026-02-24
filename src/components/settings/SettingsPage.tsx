import { useState, useEffect } from 'react'
import { ExternalLink, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { MainPanel } from '@/components/layout/MainPanel'

export function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const { data: settings } = useSettings()
  const updateSettings = useUpdateSettings()

  const [displayName, setDisplayName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingKey, setSavingKey] = useState(false)

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name)
    }
  }, [profile])

  useEffect(() => {
    if (settings?.anthropic_api_key) {
      setApiKey(settings.anthropic_api_key)
    }
  }, [settings])

  const avatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url
  const maskedKey = apiKey ? `sk-ant-...${apiKey.slice(-8)}` : ''

  async function handleSaveProfile() {
    setSavingProfile(true)
    try {
      const trimmedName = displayName.trim()
      if (!trimmedName) return
      if (trimmedName === profile?.display_name) {
        toast('No changes to save')
        return
      }
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: trimmedName })
        .eq('id', profile!.id)
      if (error) throw error
      await refreshProfile()
      toast.success('Profile updated')
    } catch (err) {
      console.error('Failed to update profile:', err)
      toast.error('Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  function handleSaveApiKey() {
    setSavingKey(true)
    updateSettings.mutate(
      { anthropic_api_key: apiKey || null },
      {
        onSuccess: () => {
          toast.success('API key saved')
          setSavingKey(false)
        },
        onError: () => {
          toast.error('Failed to save API key')
          setSavingKey(false)
        },
      }
    )
  }

  return (
    <MainPanel title="Settings">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile */}
        <section className="border border-gray-200 rounded-lg bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Profile</h2>
          <div className="flex items-center gap-4 mb-6">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-accent-500 flex items-center justify-center text-white text-xl font-medium">
                {displayName?.charAt(0).toUpperCase() ?? '?'}
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">{profile?.display_name ?? 'Loading...'}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="px-4 py-2 bg-accent-600 text-white rounded-md hover:bg-accent-700 transition-colors disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </section>

        {/* Maestro AI */}
        <section className="border border-gray-200 rounded-lg bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Maestro AI</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anthropic API Key
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Required for the Maestro AI assistant. Get your key from{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-600 hover:underline"
                >
                  console.anthropic.com
                </a>
              </p>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {settings?.anthropic_api_key && !showKey && (
                <p className="text-xs text-gray-500 mt-1">
                  Current: {maskedKey}
                </p>
              )}
            </div>
            <div className="bg-teal-50 border border-teal-100 rounded-md p-3">
              <p className="text-xs text-teal-600">
                Your API key is stored securely in the database and is only used to communicate with Anthropic's API from your browser.
              </p>
            </div>
            <div>
              <button
                onClick={handleSaveApiKey}
                disabled={savingKey}
                className="px-4 py-2 bg-accent-600 text-white rounded-md hover:bg-accent-700 transition-colors disabled:opacity-50"
              >
                {savingKey ? 'Saving...' : 'Save API key'}
              </button>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="border border-gray-200 rounded-lg bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Security</h2>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Connected accounts</p>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <GoogleIcon />
                <span className="text-sm text-gray-900">Google</span>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Connected
              </span>
            </div>
          </div>
        </section>

        {/* Apps */}
        <section className="border border-gray-200 rounded-lg bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Apps</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-accent-200 bg-accent-50">
              <div className="w-1 h-8 bg-accent-500 rounded-full" />
              <span className="flex-1 text-sm font-medium text-gray-900">Opus</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-100 text-accent-700">
                Current app
              </span>
            </div>
            <a
              href="https://allfriends.day"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="w-1 h-8 bg-blue-500 rounded-full" />
              <span className="flex-1 text-sm font-medium text-gray-900">All Friends</span>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
          </div>
        </section>

        {/* Data */}
        <section className="border border-gray-200 rounded-lg bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Data</h2>
          <p className="text-sm text-gray-500 mb-4">Export and import coming soon.</p>
          <button
            disabled
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-400 bg-gray-50 cursor-not-allowed"
          >
            Export data
          </button>
        </section>
      </div>
    </MainPanel>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
