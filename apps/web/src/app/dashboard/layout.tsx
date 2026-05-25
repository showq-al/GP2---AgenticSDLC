'use client'
import { ReactNode, useEffect, useState, createContext } from 'react'
export const UserNameContext = createContext('User')
export const IsAgentRunningContext = createContext<(v: boolean) => void>(() => {})
import { useRouter, useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import ProfileMenu from '@/components/layout/ProfileMenu'
import HelpCenter from '@/components/layout/HelpCenter'
import { supabase } from '@/lib/supabase'

type ChatHistoryItem = {
  id: string
  title: string
}

const CACHE_KEY = 'agenticsdlc_chats'

function loadCachedChats(): ChatHistoryItem[] {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    return cached ? JSON.parse(cached) : []
  } catch { return [] }
}

function saveChatsToCache(chats: ChatHistoryItem[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(chats)) } catch {}
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const [helpOpen, setHelpOpen]       = useState(false)
  const [userName, setUserName]       = useState('User')
  const [userEmail, setUserEmail]     = useState('')
  const [userAvatar, setUserAvatar]   = useState('')
  const [activeChatId, setActiveChatId] = useState('')
  const [completedChats, setCompletedChats] = useState<ChatHistoryItem[]>([])
  const [isAgentRunning, setIsAgentRunning] = useState(false)
  const [showAgentWarning, setShowAgentWarning] = useState(false)
  const [pendingChatId, setPendingChatId] = useState<string | null>(null)
  

  const router       = useRouter()
  const searchParams = useSearchParams()

  const fetchCompletedChats = async (userId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/projects/completed/${userId}`)
      if (!response.ok) return
      const data = await response.json()
      const chats = (data.projects || []).map((project: any) => ({
        id: project.id,
        title: project.title,
      }))
      setCompletedChats(chats)
      saveChatsToCache(chats)
    } catch (error) {
      console.error('Error fetching completed chats:', error)
    }
  }

  useEffect(() => {
    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) return
      const user = data.user
      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'User'
      setUserName(displayName)
      setUserEmail(user.email || '')
      setUserAvatar(user.user_metadata?.avatar_url || '')
      fetchCompletedChats(user.id)

      // Show Help Center only on fresh signup (account < 2 min old), not on regular login
      const seenKey = `agenticsdlc_help_seen_${user.id}`
      const alreadySeen = localStorage.getItem(seenKey)
      const accountAge = Date.now() - new Date(user.created_at).getTime()
      if (!alreadySeen && accountAge < 2 * 60 * 1000) {
        setHelpOpen(true)
        localStorage.setItem(seenKey, 'true')
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    const refresh = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) return
      await fetchCompletedChats(data.user.id)
    }
    window.addEventListener('completed-chats-updated', refresh)
    return () => window.removeEventListener('completed-chats-updated', refresh)
  }, [])

  useEffect(() => {
    const projectId = searchParams.get('project_id')
    if (projectId) setActiveChatId(projectId)
    else setActiveChatId('')
  }, [searchParams])

  const handleNewChat = () => {
    if (isAgentRunning) {
      setPendingChatId(null)
      setShowAgentWarning(true)
      return
    }
    setActiveChatId('')
    router.push('/dashboard/chat?new=' + Date.now())
  }

  const handleOpenChat = (chatId: string) => {
    if (isAgentRunning) {
      setPendingChatId(chatId)
      setShowAgentWarning(true)
      return
    }
    setActiveChatId(chatId)
    router.push(`/dashboard/chat?project_id=${encodeURIComponent(chatId)}`)
  }

  const handleAgentWarningConfirm = () => {
    setShowAgentWarning(false)
    window.dispatchEvent(new CustomEvent('force-stop-agents'))
    if (pendingChatId) {
      setActiveChatId(pendingChatId)
      router.push(`/dashboard/chat?project_id=${encodeURIComponent(pendingChatId)}`)
      setPendingChatId(null)
    } else {
      setActiveChatId('')
      router.push('/dashboard/chat?new=' + Date.now())
    }
  }

  const handleAgentWarningCancel = () => {
    setShowAgentWarning(false)
    setPendingChatId(null)
  }

  const handleDeleteChat = async (chatId: string) => {
    const updated = completedChats.filter(c => c.id !== chatId)
    setCompletedChats(updated)
    saveChatsToCache(updated)

    if (activeChatId === chatId) {
      setActiveChatId('')
      router.push('/dashboard/chat')
    }

    try {
      const response = await fetch(`http://localhost:8000/projects/${chatId}`, { method: 'DELETE' })
      if (!response.ok) {
        const { data } = await supabase.auth.getUser()
        if (data.user) await fetchCompletedChats(data.user.id)
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
    }
  }

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar
        isOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
        onNewChat={handleNewChat}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenChat={handleOpenChat}
        onDeleteChat={handleDeleteChat}
        chats={completedChats}
        activeChatId={activeChatId}
        userName={userName}
      />

<main className="flex-1 min-w-0">
  <IsAgentRunningContext.Provider value={setIsAgentRunning}>
    <UserNameContext.Provider value={userName}>
      {children}
    </UserNameContext.Provider>
  </IsAgentRunningContext.Provider>
</main>

      <HelpCenter open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Agent-running warning modal */}
      {showAgentWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleAgentWarningCancel} />
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{ background: 'linear-gradient(160deg, #1a0035 0%, #0d0018 100%)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-yellow-500/15">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="mb-1 text-base font-semibold text-white">Agents are still running</h3>
            <p className="mb-6 text-sm text-white/50 leading-relaxed">
              The current session is still being processed. Leaving now will stop all agents and discard any unfinished output. Are you sure you want to continue?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleAgentWarningCancel}
                className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
              >
                Stay
              </button>
              <button
                onClick={handleAgentWarningConfirm}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-white transition hover:bg-white/8"
              >
                End & View Chat
              </button>
            </div>
          </div>
        </div>
      )}

      <ProfileMenu
        open={profileOpen}
        onOpenChange={setProfileOpen}
        userName={userName}
        userEmail={userEmail}
        userAvatar={userAvatar}
        onProfileUpdated={({ name, avatarUrl }) => {
          setUserName(name)
          setUserAvatar(avatarUrl)
        }}
      />
    </div>
  )
}