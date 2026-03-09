'use client'

import SidebarProjectItem from './SidebarProjectItem'

const staticChats = [
  'Recommendation System',
  'AI-Powered Health Analyzer',
  'Automated Data Insights Tool',
  'Emotional Wellness Tracker',
  'Diet Recommendation AI',
]

export default function SidebarProjectList() {
  return (
    <div className="space-y-1">
      {staticChats.map((chat, index) => (
        <SidebarProjectItem
          key={`${chat}-${index}`}
          title={chat}
        />
      ))}
    </div>
  )
}