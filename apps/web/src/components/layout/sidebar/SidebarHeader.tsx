'use client'

type SidebarHeaderProps = {
  onToggleSidebar: () => void
}

export default function SidebarHeader({ onToggleSidebar }: SidebarHeaderProps) {
  return (
    <div className="flex h-14 items-center justify-end px-4">
      <button
        onClick={onToggleSidebar}
        className="rounded-xl p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
        aria-label="Collapse sidebar"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 6h8M8 12h8M8 18h8"
          />
        </svg>
      </button>
    </div>
  )
}