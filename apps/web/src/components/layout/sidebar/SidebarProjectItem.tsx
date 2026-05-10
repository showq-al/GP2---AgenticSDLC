'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'

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
  const [showConfirm, setShowConfirm] = useState(false)

  const handleTrashClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowConfirm(true)
  }

  const handleConfirm = () => {
    setShowConfirm(false)
    onDelete?.()
  }

  const handleCancel = () => {
    setShowConfirm(false)
  }

  return (
    <>
      <div
        className={`group flex items-center justify-between rounded-xl px-3 py-3 text-sm transition ${
          active
            ? 'bg-white/10 text-white'
            : 'text-white/75 hover:bg-white/5 hover:text-white'
        }`}
      >
        <button
          onClick={onClick}
          className="min-w-0 flex-1 truncate text-left"
          title={title}
        >
          {title}
        </button>

        <button
          onClick={handleTrashClick}
          className="ml-2 shrink-0 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
          aria-label="Delete chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-7 4v6m4-6v6m4-6v6M5 7l1 14h12l1-14" />
          </svg>
        </button>
      </div>

      {/* Confirmation popup portal */}
      {showConfirm && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancel} />

          {/* Dialog */}
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{ background: 'linear-gradient(160deg, #1a0035 0%, #0d0018 100%)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Icon */}
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-7 4v6m4-6v6m4-6v6M5 7l1 14h12l1-14" />
              </svg>
            </div>

            <h3 className="mb-1 text-base font-semibold text-white">Delete chat?</h3>
            <p className="mb-6 text-sm text-white/50 leading-relaxed">
              "<span className="text-white/70">{title}</span>" will be permanently deleted. This cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/8 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
