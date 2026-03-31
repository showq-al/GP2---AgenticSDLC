'use client'

import Plasma from '../components/ui/Plasma'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProfileMenu from '@/components/layout/ProfileMenu'
import { Sidebar } from '@/components/layout/sidebar'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [projectTitle, setProjectTitle]       = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [sidebarOpen, setSidebarOpen]         = useState(true)
  const [profileOpen, setProfileOpen]         = useState(false)
  const [userName, setUserName]               = useState('User')
  const [userEmail, setUserEmail]             = useState('')
  const [userAvatar, setUserAvatar]           = useState('')
  const [completedChats, setCompletedChats]   = useState<{ id: string; title: string }[]>([])
  const [activeChatId, setActiveChatId]       = useState<string>('')

  const router = useRouter()

  // ── Load user + chat list on mount ──────────────────────────────────────
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
      await fetchCompletedChats(user.id)
    }
    loadUser()
  }, [])

  const fetchCompletedChats = async (userId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/projects/completed/${userId}`)
      if (!response.ok) throw new Error('Failed to fetch completed chats')
      const data = await response.json()
      setCompletedChats(
        (data.projects || []).map((project: any) => ({
          id: project.id,
          title: project.title,
        }))
      )
    } catch (error) {
      console.error('Error fetching completed chats:', error)
    }
  }

  // ── Submit new project form → navigate to dashboard/chat ───────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectTitle || !projectDescription) {
      alert('Please fill in both fields')
      return
    }
    router.push(
      `/dashboard/chat?name=${encodeURIComponent(projectTitle)}&description=${encodeURIComponent(projectDescription)}`
    )
  }

  // ── Sidebar handlers ────────────────────────────────────────────────────
  const handleNewChat = () => {
    setProjectTitle('')
    setProjectDescription('')
    setActiveChatId('')
    router.push('/')
  }

  const handleOpenChat = (chatId: string) => {
    setActiveChatId(chatId)
    router.push(`/dashboard/chat?project_id=${encodeURIComponent(chatId)}`)
  }

  // ── Delete a chat from the sidebar ─────────────────────────────────────
  // Without this handler the sidebar's Yes button was a no-op on this page,
  // because onDeleteChat was never passed — that's why some deletes appeared
  // to do nothing when the user was on the home page.
  const handleDeleteChat = async (chatId: string) => {
    // Optimistic: remove immediately so the UI feels instant
    setCompletedChats(prev => prev.filter(c => c.id !== chatId))

    try {
      const response = await fetch(`http://localhost:8000/projects/${chatId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        // Roll back if the API call fails
        console.error('Delete failed — restoring chat list')
        const { data } = await supabase.auth.getUser()
        if (data.user) await fetchCompletedChats(data.user.id)
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
      const { data } = await supabase.auth.getUser()
      if (data.user) await fetchCompletedChats(data.user.id)
    }
  }

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar
        isOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
        onNewChat={handleNewChat}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenChat={handleOpenChat}
        onDeleteChat={handleDeleteChat}
        chats={completedChats}
        activeChatId={activeChatId}
        userName={userName}
      />

      <div className="relative flex-1 min-w-0 overflow-hidden bg-black">
        <div className="absolute inset-0">
          <Plasma
            color="#8B5CF6"
            speed={0.3}
            direction="forward"
            scale={1.5}
            opacity={0.3}
            mouseInteractive={true}
          />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-8">
          <div className="w-full max-w-3xl space-y-12">
            <div className="text-center space-y-3">
              <div className="mb-2 flex items-center justify-center space-x-0.5">
                <img
                  src="/images/AgenticSDLCLogo.png"
                  alt="AgenticSDLC Logo"
                  width={80}
                  height={60}
                  className="object-contain"
                />
                <h1 className="text-4xl font-medium tracking-wide text-white">
                  AgenticSDLC
                </h1>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Enter a project name"
                  value={projectTitle}
                  onChange={e => setProjectTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-700/50 bg-gray-900/40 px-5 py-3 text-sm text-white placeholder-gray-500 transition focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                />
              </div>

              <div className="relative">
                <textarea
                  placeholder="Ask our AI team to create a..."
                  value={projectDescription}
                  onChange={e => setProjectDescription(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-gray-700/50 bg-gray-900/40 px-5 py-3 pr-14 text-sm text-white placeholder-gray-500 transition focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                />
                <button
                  type="submit"
                  className="group absolute bottom-3 right-3 rounded-md bg-purple-600/80 p-2 transition duration-200 hover:bg-purple-600"
                >
                  <svg
                    width="18"
                    height="18"
                    fill="white"
                    viewBox="0 0 20 20"
                    className="transform rotate-45"
                  >
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
            </form>

            <p className="text-center text-xs text-gray-500">
              AgenticSDLC may produce inaccurate results. These AI responses are
              drafts requiring verification.
            </p>
          </div>
        </div>
      </div>

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