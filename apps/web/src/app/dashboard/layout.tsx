'use client'

import { ReactNode, useState } from 'react'
import LeftRail from '@/components/layout/LeftRail'
import { Sidebar } from '@/components/layout/sidebar'
import ProfileMenu from '@/components/layout/ProfileMenu'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)

  const handleNewChat = () => {
    // Temporary "new chat" behavior:
    // just go to dashboard root. Later we will clear chat store.
    window.location.href = '/dashboard/chat'
  }

  return (
    <div className="flex min-h-screen bg-black">
      <LeftRail
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onNewChat={handleNewChat}
        onOpenProfile={() => setProfileOpen(true)}
      />

      {sidebarOpen && <Sidebar />}

      <main className="flex-1">{children}</main>

      <ProfileMenu open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  )
}