'use client'

type SidebarProjectItemProps = {
  title: string
  active?: boolean
  onClick?: () => void
}

export default function SidebarProjectItem({
  title,
  active = false,
  onClick,
}: SidebarProjectItemProps) {
  return (
    <div
      className={`group flex items-center justify-between rounded-xl px-3 py-3 text-sm transition ${
        active
          ? 'bg-white/10 text-white'
          : 'text-white/75 hover:bg-white/5 hover:text-white'
      }`}
    >
      <button
        onClick={onClick}
        className="flex-1 truncate text-left"
      >
        {title}
      </button>

      {/* Delete icon */}
      <button
        className="ml-2 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
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
    </div>
  )
}