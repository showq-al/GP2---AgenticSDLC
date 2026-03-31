'use client'
import { useState, useMemo } from 'react'
import SidebarProjectList from './SidebarProjectList'
import SidebarSearch from './SidebarSearch'

type ChatHistoryItem = {
  id: string
  title: string
}

type SidebarProps = {
  isOpen: boolean
  onToggleSidebar: () => void
  onNewChat: () => void
  onOpenProfile: () => void
  onOpenChat: (chatId: string) => void
  onDeleteChat?: (chatId: string) => void
  chats: ChatHistoryItem[]
  activeChatId?: string
  userName?: string
}

export default function Sidebar({
  isOpen,
  onToggleSidebar,
  onNewChat,
  onOpenProfile,
  onOpenChat,
  onDeleteChat,
  chats,
  activeChatId,
  userName = 'User',
}: SidebarProps) {
  // ── Search ──────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('')

  const filteredChats = useMemo(
    () =>
      searchTerm.trim()
        ? chats.filter(c =>
            c.title.toLowerCase().includes(searchTerm.trim().toLowerCase())
          )
        : chats,
    [chats, searchTerm]
  )

  // ── Collapsed sidebar ────────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <aside className="flex h-screen w-14 shrink-0 flex-col items-center justify-between border-r border-white/10 bg-[#140022]">
        <div className="flex h-14 w-full items-center justify-center border-b border-white/10 bg-black/25">
          <img
            src="/images/AgenticSDLCLogo.png"
            alt="AgenticSDLC Logo"
            className="h-7 w-7 object-contain"
          />
        </div>

        <div className="flex flex-1 flex-col items-center gap-4 pt-4">
          <button
            onClick={onToggleSidebar}
            className="rounded-xl p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Open sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <button
            onClick={onNewChat}
            className="rounded-xl p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="New chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
            </svg>
          </button>
        </div>

        <div className="pb-3">
          <button
            onClick={onOpenProfile}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Open profile"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-medium text-white">
              {userName.slice(0, 1).toUpperCase()}
            </div>
          </button>
        </div>
      </aside>
    )
  }

  // ── Expanded sidebar ─────────────────────────────────────────────────────
  return (
    <aside className="flex h-screen w-[330px] shrink-0 overflow-hidden border-r border-white/10 bg-[#19002e] text-white">
      {/* Left slim strip */}
      <div className="flex h-full w-14 shrink-0 flex-col items-center justify-between border-r border-white/10">
        <div className="flex h-14 w-full items-center justify-center border-b border-white/10 bg-black/25">
          <img
            src="/images/AgenticSDLCLogo.png"
            alt="AgenticSDLC Logo"
            className="h-7 w-7 object-contain"
          />
        </div>
        <div className="pb-3">
          <button
            onClick={onOpenProfile}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Open profile"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-medium text-white">
              {userName.slice(0, 1).toUpperCase()}
            </div>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex h-14 items-center justify-end px-4">
          <button
            onClick={onToggleSidebar}
            className="rounded-xl p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Collapse sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {/* New chat */}
          <button
            onClick={onNewChat}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-white transition hover:bg-white/5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
            </svg>
            <span className="text-[15px]">New chat</span>
          </button>

          {/* Search */}
          <SidebarSearch onSearch={setSearchTerm} />

          {/* Chat list */}
          <div className="mt-8">
            <div className="mb-4 px-3 text-[15px] text-white/45">Your chats</div>
            <SidebarProjectList
              chats={filteredChats}
              activeChatId={activeChatId}
              onOpenChat={onOpenChat}
              onDeleteChat={onDeleteChat}
              isFiltered={searchTerm.trim().length > 0}
            />
          </div>
        </div>

        {/* Bottom profile strip */}
        <div className="border-t border-white/10 p-3">
          <button
            onClick={onOpenProfile}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-white/5"
          >
            <span className="truncate text-sm text-white">{userName}</span>
          </button>
        </div>
      </div>
    </aside>
  )
}