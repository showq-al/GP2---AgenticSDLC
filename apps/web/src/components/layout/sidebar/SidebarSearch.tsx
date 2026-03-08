'use client'

export default function SidebarSearch() {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold tracking-wide text-white/50">
        Search chats
      </div>
      <input
        className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-white/20"
        placeholder="Search chats..."
      />
    </div>
  )
}
