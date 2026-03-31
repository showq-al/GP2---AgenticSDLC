'use client'
import { ReactNode, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import ProfileMenu from '@/components/layout/ProfileMenu'
import { supabase } from '@/lib/supabase'

type ChatHistoryItem = {
  id: string
  title: string
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen]   = useState(true)
  const [profileOpen, setProfileOpen]   = useState(false)
  const [userName, setUserName]         = useState('User')
  const [userEmail, setUserEmail]       = useState('')
  const [userAvatar, setUserAvatar]     = useState('')
  const [completedChats, setCompletedChats] = useState<ChatHistoryItem[]>([])
  const [activeChatId, setActiveChatId] = useState('')

  const router       = useRouter()
  const searchParams = useSearchParams()

  // ── Fetch completed chats ──────────────────────────────────────────────
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

  // ── Load user on mount ─────────────────────────────────────────────────
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

  // ── Refresh chat list when a project completes ─────────────────────────
  useEffect(() => {
    const refresh = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) return
      await fetchCompletedChats(data.user.id)
    }
    window.addEventListener('completed-chats-updated', refresh)
    return () => window.removeEventListener('completed-chats-updated', refresh)
  }, [])

  // ── Keep activeChatId in sync with URL ────────────────────────────────
  useEffect(() => {
    const projectId = searchParams.get('project_id')
    if (projectId) setActiveChatId(projectId)
  }, [searchParams])

  // ── New chat — go back to the home page (app/page.tsx) ───────────────
  const handleNewChat = () => {
    setActiveChatId('')
    router.push('/')
  }

  // ── Open an existing chat ──────────────────────────────────────────────
  const handleOpenChat = (chatId: string) => {
    setActiveChatId(chatId)
    router.push(`/dashboard/chat?project_id=${encodeURIComponent(chatId)}`)
  }

  // ── Delete a chat ──────────────────────────────────────────────────────
  // Optimistically removes from the sidebar, then hits the backend.
  // If currently viewing the deleted chat, navigates to an empty new chat.
  const handleDeleteChat = async (chatId: string) => {
    // Optimistic UI update — remove instantly so the sidebar feels fast
    setCompletedChats(prev => prev.filter(c => c.id !== chatId))

    if (activeChatId === chatId) {
      setActiveChatId('')
      router.push('/')
    }

    try {
      const response = await fetch(`http://localhost:8000/projects/${chatId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        // Roll back on failure
        console.error('Failed to delete project — refreshing list')
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
        onOpenChat={handleOpenChat}
        onDeleteChat={handleDeleteChat}
        chats={completedChats}
        activeChatId={activeChatId}
        userName={userName}
      />

      <main className="flex-1 min-w-0">{children}</main>

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