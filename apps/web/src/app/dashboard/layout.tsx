'use client'

import { ReactNode, useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import ProfileMenu from '@/components/layout/ProfileMenu'
import { supabase } from '@/lib/supabase'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const [userName, setUserName] = useState('User')
  const [userEmail, setUserEmail] = useState('')
  const [userAvatar, setUserAvatar] = useState('')

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
    }

    loadUser()
  }, [])

  const handleNewChat = () => {
    window.location.href = '/'
  }

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar
        isOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onNewChat={handleNewChat}
        onOpenProfile={() => setProfileOpen(true)}
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