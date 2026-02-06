'use client'

import { useState, useEffect, useRef } from 'react'
import Plasma from '../../../components/ui/Plasma'
import { useSearchParams } from 'next/navigation'

interface Message {
  role: 'user' | 'agent'
  agent?: string
  content: string
  timestamp: Date
  status?: 'thinking' | 'complete'
}

export default function ChatPage() {
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  useEffect(() => {
    const projectName = searchParams.get('name')
    const projectDescription = searchParams.get('description')
    
    if (projectName && projectDescription) {
      // Add user message first
      setMessages([
        {
          role: 'user',
          content: projectDescription,
          timestamp: new Date()
        },
        {
          role: 'agent',
          agent: 'Requirement Analyst',
          content: 'Extracting Requirements...',
          timestamp: new Date(),
          status: 'thinking'
        }
      ])
      
      // Call API
      generateRequirements(projectName, projectDescription)
    }
  }, [searchParams])
  
  const generateRequirements = async (name: string, description: string) => {
    try {
      const response = await fetch('http://localhost:8000/agents/generate-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: name,
          project_description: description
        })
      })
      
      const data = await response.json()
      
      setMessages(prev => prev.map(msg => 
        msg.status === 'thinking' 
          ? { ...msg, content: data.content, status: 'complete' }
          : msg
      ))
    } catch (error) {
      console.error('Error:', error)
    }
  }
  
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      <div className="absolute inset-0">
        <Plasma 
          color="#8B5CF6"
          speed={0.3}
          direction="forward"
          scale={1.5}
          opacity={0.2}
          mouseInteractive={true}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <div className="border-b border-gray-800 bg-black/50 backdrop-blur-sm p-4">
          <div className="flex items-center space-x-2">
            <img 
              src="/images/AgenticSDLCLogo.png" 
              alt="Logo" 
              width={32} 
              height={32}
              className="object-contain"
            />
            <h1 className="text-xl font-medium text-white">AgenticSDLC</h1>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message, index) => (
              <div key={index} className="flex items-start space-x-3">
                {/* Icon */}
                <div className="flex-shrink-0">
                  {message.role === 'user' ? (
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden">
                      <img 
                        src="/images/Chat-GPT-icon.png" 
                        alt="AI" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  {/* Name */}
                  <div className="text-white font-semibold mb-2">
                    {message.role === 'user' ? 'User' : message.agent}
                  </div>
                  
                  {/* Message Container */}
                  <div className="bg-black/80 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4">
                    <div className="text-gray-300">
                      {message.status === 'thinking' ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm italic">{message.content}</span>
                          <div className="flex space-x-1">
                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 bg-black/50 backdrop-blur-sm p-4">
          <p className="text-center text-xs text-gray-500">
            AgenticSDLC may produce inaccurate results. Treat all responses as drafts requiring verification.
          </p>
        </div>
      </div>
    </div>
  )
}

function formatMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2 text-white">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3 text-white">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb- text-white">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/^- (.+)$/gm, '<li class="ml-4">• $1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4">$1. $2</li>')
}