'use client'
import { useState } from 'react'

type SidebarProjectItemProps = {
  title: string
  active?: boolean
  onClick?: () => void
  onDelete?: () => void
}

export default function SidebarProjectItem({
  title,
  active = false,
  onClick,
  onDelete,
}: SidebarProjectItemProps) {
  const [confirming, setConfirming] = useState(false)

  const handleTrashClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirming(true)
  }

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirming(false)
    onDelete?.()
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirming(false)
  }

  return (
    <div
      className={`group flex items-center justify-between rounded-xl px-3 py-3 text-sm transition ${
        active
          ? 'bg-white/10 text-white'
          : 'text-white/75 hover:bg-white/5 hover:text-white'
      }`}
    >
      {/* Project title */}
      <button
        onClick={onClick}
        className="min-w-0 flex-1 truncate text-left"
        title={title}
      >
        {title}
      </button>

      {/* ── Confirm delete inline ── */}
      {confirming ? (
        <div
          className="ml-2 flex shrink-0 items-center gap-1.5"
          onClick={e => e.stopPropagation()}
        >
          <span className="text-xs text-red-400">Delete?</span>
          <button
            onClick={handleConfirm}
            className="rounded px-1.5 py-0.5 text-xs text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
          >
            Yes
          </button>
          <button
            onClick={handleCancel}
            className="rounded px-1.5 py-0.5 text-xs text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            No
          </button>
        </div>
      ) : (
        /* ── Trash icon (appears on hover) ── */
        <button
          onClick={handleTrashClick}
          className="ml-2 shrink-0 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
          aria-label="Delete chat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 7h12M9 7V5h6v2m-7 4v6m4-6v6m4-6v6M5 7l1 14h12l1-14"
            />
          </svg>
        </button>
      )}
    </div>
  )
}