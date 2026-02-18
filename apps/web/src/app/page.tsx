'use client'

import Plasma from '../components/ui/Plasma'
import { useState } from 'react'

export default function Home() {
  const [projectTitle, setProjectTitle] = useState('')
  const [projectDescription, setProjectDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!projectTitle || !projectDescription) {
      alert('Please fill in both fields')
      return
    }
    
    // Navigate to chat page
    window.location.href = `/dashboard/chat?name=${encodeURIComponent(projectTitle)}&description=${encodeURIComponent(projectDescription)}`
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Plasma Background - darker and more subtle */}
      <div className="absolute inset-0">
        <Plasma 
          color="#8B5CF6"
          speed={0.3}
          direction="forward"
          scale={1.5}
          opacity={0.3}
          mouseInteractive={true}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-8">
        <div className="w-full max-w-3xl space-y-12">
          {/* Logo and Title - centered */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center space-x-0.5 mb-2">
              <img 
                src="/images/AgenticSDLCLogo.png" 
                alt="AgenticSDLC Logo" 
                width={80} 
                height={60}
                className="object-contain"
              />
              <h1 className="text-4xl font-medium tracking-wide text-white">AgenticSDLC</h1>
            </div>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Project Name Input */}
            <div>
              <input
                type="text"
                placeholder="Enter a project name"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="w-full px-5 py-3 bg-gray-900/40 backdrop-blur-sm border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
              />
            </div>
            
            {/* Textarea with Send Button */}
            <div className="relative">
              <textarea
                placeholder="Ask our AI team to create a..."
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={4}
                className="w-full px-5 py-3 pr-14 bg-gray-900/40 backdrop-blur-sm border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition resize-none"
              />
              {/* Send Button - positioned inside textarea */}
              <button
                type="submit"
                className="absolute right-3 bottom-3 p-2 bg-purple-600/80 hover:bg-purple-600 rounded-md transition duration-200 group"
              >
                <svg width="18" height="18" fill="white" viewBox="0 0 20 20" className="transform rotate-45">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
                </svg>
              </button>
            </div>
          </form>

          {/* Footer Text */}
          <p className="text-center text-xs text-gray-500">
            AgenticSDLC may produce inaccurate results. These AI responses are drafts requiring verification.
          </p>
        </div>
      </div>
    </div>
  )
}
