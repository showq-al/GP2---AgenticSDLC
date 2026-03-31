'use client'
import SidebarProjectItem from './SidebarProjectItem'

type ChatHistoryItem = {
  id: string
  title: string
}

type SidebarProjectListProps = {
  chats?: ChatHistoryItem[]
  activeChatId?: string
  onOpenChat?: (chatId: string) => void
  onDeleteChat?: (chatId: string) => void
  isFiltered?: boolean   // true when a search term is active
}

export default function SidebarProjectList({
  chats = [],
  activeChatId,
  onOpenChat = () => {},
  onDeleteChat,
  isFiltered = false,
}: SidebarProjectListProps) {
  if (chats.length === 0) {
    return (
      <div className="px-3 py-2 text-sm text-white/40">
        {isFiltered ? 'No chats match your search.' : 'No completed chats yet'}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {chats.map((chat) => (
        <SidebarProjectItem
          key={chat.id}
          title={chat.title}
          active={chat.id === activeChatId}
          onClick={() => onOpenChat(chat.id)}
          onDelete={() => onDeleteChat?.(chat.id)}
        />
      ))}
    </div>
  )
}