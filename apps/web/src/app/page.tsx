'use client'

import Plasma from '../components/ui/Plasma'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProfileMenu from '@/components/layout/ProfileMenu'
import { Sidebar } from '@/components/layout/sidebar'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [projectTitle, setProjectTitle] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const [userName, setUserName] = useState('User')
  const [userEmail, setUserEmail] = useState('')
  const [userAvatar, setUserAvatar] = useState('')

  const router = useRouter()

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

  const handleNewChat = () => {
    setProjectTitle('')
    setProjectDescription('')
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
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-700/50 bg-gray-900/40 px-5 py-3 text-sm text-white placeholder-gray-500 transition focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                />
              </div>

              <div className="relative">
                <textarea
                  placeholder="Ask our AI team to create a..."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
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