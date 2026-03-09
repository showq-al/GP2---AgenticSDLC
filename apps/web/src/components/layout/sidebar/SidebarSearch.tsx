'use client'

export default function SidebarSearch() {
  return (
    <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-white/90 transition hover:bg-white/5">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
        />
      </svg>

      <span className="text-[15px]">Search chats</span>
    </button>
  )
}