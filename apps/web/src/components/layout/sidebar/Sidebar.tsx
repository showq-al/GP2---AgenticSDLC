'use client'

import SidebarHeader from './SidebarHeader'
import SidebarSearch from './SidebarSearch'
import SidebarProjectList from './SidebarProjectList'

export default function Sidebar() {
  return (
    <aside className="h-screen w-80 border-r border-white/10 bg-black/30 text-white/80">
      <div className="flex h-full flex-col">
        <SidebarHeader />
        <div className="px-4">
          <SidebarSearch />
        </div>
        <div className="mt-4 flex-1 overflow-y-auto px-4 pb-4">
          <SidebarProjectList />
        </div>
      </div>
    </aside>
  )
}
