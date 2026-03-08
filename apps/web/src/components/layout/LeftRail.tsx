'use client'

import { useRouter } from 'next/navigation'
import { Menu, SquarePen, User } from 'lucide-react'

type Props = {
  onToggleSidebar: () => void
  onNewChat: () => void
  onOpenProfile: () => void
}

export default function LeftRail({ onToggleSidebar, onNewChat, onOpenProfile }: Props) {
  return (
    <div className="flex h-screen w-14 flex-col items-center justify-between border-r border-white/10 bg-black/40 py-3 backdrop-blur">
      {/* Top icons */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        <button
          onClick={onNewChat}
          className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="New chat"
        >
          <SquarePen size={20} />
        </button>
      </div>

      {/* Bottom profile icon */}
      <div className="pb-1">
        <button
          onClick={onOpenProfile}
          className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="Profile"
        >
          <User size={20} />
        </button>
      </div>
    </div>
  )
}