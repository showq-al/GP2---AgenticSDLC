'use client'
import { useState, useEffect, useRef } from 'react'
//import Plasma from '../../../components/ui/Plasma'
import { useSearchParams } from 'next/navigation'

const plantumlEncoder = require('plantuml-encoder')

interface Message {
  role: 'user' | 'agent'
  agent?: string
  content: string
  timestamp: Date
  status?: 'thinking' | 'complete' | 'awaiting_approval'
  structured_data?: {
    use_case_diagram?: string
    class_diagram?: string
    diagrams_count?: number
    // Developer Agent structured data
    frontend?: string
    backend?: string
    database?: string
    external_integrations?: string
    stack_summary?: string
    technologies?: string[]
  }
}

function PlantUMLDiagram({ code, title }: { code: string; title: string }) {
  const [imgError, setImgError] = useState(false)
  if (!code) return null
  try {
    const encoded = plantumlEncoder.encode(code)
    const url = `https://www.plantuml.com/plantuml/svg/${encoded}`
    return (
      <div className="mb-4">
        <p className="text-sm font-semibold text-purple-400 mb-2">{title}</p>
        {imgError ? (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-2">Diagram preview unavailable. PlantUML code:</p>
            <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">{code}</pre>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-4 overflow-x-auto">
            <img
              src={url}
              alt={title}
              className="max-w-full h-auto mx-auto"
              onError={() => setImgError(true)}
            />
          </div>
        )}
      </div>
    )
  } catch (e) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-4">
        <p className="text-xs text-gray-500 mb-2">{title} - PlantUML code:</p>
        <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">{code}</pre>
      </div>
    )
  }
}

export default function ChatPage() {
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [showApproval, setShowApproval] = useState(false)
  const [feedbackEnabled, setFeedbackEnabled] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [projectId, setProjectId] = useState<string>('')
  const [approvedRequirements, setApprovedRequirements] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setIsReady(true)
  }, [])

  useEffect(() => {
    if (!isReady) return
    const projectName = searchParams.get('name')
    const projectDescription = searchParams.get('description')
    if (projectName && projectDescription) {
      setMessages([
        {
          role: 'user',
          content: projectDescription,
          timestamp: new Date()
        },
        {
          role: 'agent',
          agent: 'Requirement Analyst',
          content: 'Extracting Requirements',
          timestamp: new Date(),
          status: 'thinking'
        }
      ])
      generateRequirements(projectName, projectDescription)
    }
  }, [searchParams, isReady])

  const generateRequirements = async (name: string, description: string) => {
    setIsGenerating(true)
    abortControllerRef.current = new AbortController()
    try {
      const response = await fetch('http://localhost:8000/agents/generate-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_name: name, project_description: description }),
        signal: abortControllerRef.current.signal
      })
      const data = await response.json()
      setMessages(prev => prev.map(msg =>
        msg.status === 'thinking'
          ? { ...msg, content: data.content, status: 'awaiting_approval' }
          : msg
      ))
      setShowApproval(true)
      setIsGenerating(false)
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessages(prev => prev.filter(msg => msg.status !== 'thinking'))
      } else {
        console.error('Error:', error)
      }
      setIsGenerating(false)
    }
  }

  const generateDesign = async (
    name: string,
    description: string,
    requirements: string,
    projId: string
  ) => {
    setIsGenerating(true)
    try {
      const response = await fetch('http://localhost:8000/agents/generate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: name,
          project_description: description,
          context: { requirements: requirements }
        })
      })
      const data = await response.json()

      setMessages(prev => prev.map(msg =>
        msg.status === 'thinking' && msg.agent === 'Design Architect'
          ? { ...msg, content: data.content, status: 'complete', structured_data: data.structured_data }
          : msg
      ))

      if (projId && data.structured_data) {
        await fetch(`http://localhost:8000/projects/${projId}/design`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            use_case_diagram: data.structured_data.use_case_diagram || '',
            class_diagram: data.structured_data.class_diagram || '',
            raw_content: data.content
          })
        })
        console.log('✅ Design saved to MongoDB!')
      }

      // ✅ After design is done, automatically trigger Developer Agent
      const designContent = data.content || ''
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'agent',
          agent: 'Developer',
          content: 'Recommending Technology Stack',
          timestamp: new Date(),
          status: 'thinking'
        }])
        generateTechStack(name, description, requirements, designContent, projId)
      }, 500)

    } catch (error) {
      console.error('Error generating design:', error)
      setMessages(prev => prev.map(msg =>
        msg.status === 'thinking' && msg.agent === 'Design Architect'
          ? { ...msg, content: 'Failed to generate diagrams.', status: 'complete' }
          : msg
      ))
      setIsGenerating(false)
    }
  }

  // ✅ NEW: Developer Agent function
  const generateTechStack = async (
    name: string,
    description: string,
    requirements: string,
    design: string,
    projId: string
  ) => {
    setIsGenerating(true)
    try {
      const response = await fetch('http://localhost:8000/agents/generate-tech-stack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: name,
          project_description: description,
          context: {
            requirements: requirements,
            design: design,
            project_id: projId
          }
        })
      })
      const data = await response.json()

      setMessages(prev => prev.map(msg =>
        msg.status === 'thinking' && msg.agent === 'Developer'
          ? {
              ...msg,
              content: data.content,
              status: 'complete',
              structured_data: data.structured_data
            }
          : msg
      ))

      // Save tech_stack to MongoDB - same pattern as design
      if (projId) {
        await fetch(`http://localhost:8000/projects/${projId}/tech-stack`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: data.content,
            structured_data: data.structured_data
          })
        })
        console.log('✅ Tech stack saved to MongoDB!')
      }

      // Trigger Tester Agent after Developer Agent
      const techStackContent = data.content || ''
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'agent',
          agent: 'Software Tester',
          content: 'Generating Test Strategy',
          timestamp: new Date(),
          status: 'thinking'
        }])
        generateTestStrategy(name, description, requirements, design, techStackContent, projId)
      }, 500)

    } catch (error) {
      console.error('Error generating tech stack:', error)
      setMessages(prev => prev.map(msg =>
        msg.status === 'thinking' && msg.agent === 'Developer'
          ? { ...msg, content: 'Failed to generate technology stack.', status: 'complete' }
          : msg
      ))
      setIsGenerating(false)
    }
  }

  const generateTestStrategy = async (
    name: string,
    description: string,
    requirements: string,
    design: string,
    techStack: string,
    projId: string
  ) => {
    setIsGenerating(true)
    try {
      const response = await fetch('http://localhost:8000/agents/generate-test-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: name,
          project_description: description,
          context: {
            requirements: requirements,
            design: design,
            tech_stack: techStack,
            project_id: projId
          }
        })
      })
      const data = await response.json()

      setMessages(prev => prev.map(msg =>
        msg.status === 'thinking' && msg.agent === 'Software Tester'
          ? { ...msg, content: data.content, status: 'complete', structured_data: data.structured_data }
          : msg
      ))
      console.log('✅ Test strategy generated!')
    } catch (error) {
      console.error('Error generating test strategy:', error)
      setMessages(prev => prev.map(msg =>
        msg.status === 'thinking' && msg.agent === 'Software Tester'
          ? { ...msg, content: 'Failed to generate test strategy.', status: 'complete' }
          : msg
      ))
    }
    setIsGenerating(false)
  }

  const refineRequirements = async (userFeedback: string) => {
    try {
      const originalRequirements = messages.find(
        msg => msg.agent === 'Requirement Analyst' && msg.status !== 'thinking'
      )?.content || ''
      const projectName = searchParams.get('name') || ''
      const projectDescription = searchParams.get('description') || ''
      const response = await fetch('http://localhost:8000/agents/refine-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: projectName,
          project_description: projectDescription,
          original_requirements: originalRequirements,
          user_feedback: userFeedback
        })
      })
      const data = await response.json()
      setMessages(prev => prev.map(msg =>
        msg.status === 'thinking' && msg.agent === 'Requirement Analyst'
          ? { ...msg, content: data.content, status: 'awaiting_approval' }
          : msg
      ))
      setShowApproval(true)
      setIsGenerating(false)
    } catch (error) {
      console.error('Error refining requirements:', error)
      setIsGenerating(false)
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsGenerating(false)
      setMessages(prev => prev.filter(msg => msg.status !== 'thinking'))
    }
  }

  const handleApprove = async () => {
    setShowApproval(false)
    setFeedbackEnabled(false)

    let savedProjectId = ''
    let savedRequirements = ''

    try {
      const { createBrowserClient } = await import('@supabase/ssr')
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { alert('You must be logged in to save requirements'); return }

      const projectName = searchParams.get('name') || ''
      const projectDescription = searchParams.get('description') || ''

      const projectResponse = await fetch(
        `http://localhost:8000/projects/?user_id=${encodeURIComponent(user.id)}&name=${encodeURIComponent(projectName)}&description=${encodeURIComponent(projectDescription)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      )
      if (!projectResponse.ok) throw new Error('Failed to create project')
      const { project_id } = await projectResponse.json()
      savedProjectId = project_id
      setProjectId(project_id)

      const requirementsMessage = messages.find(
        msg => msg.agent === 'Requirement Analyst' && msg.status === 'awaiting_approval'
      )

      if (requirementsMessage) {
        savedRequirements = requirementsMessage.content
        setApprovedRequirements(requirementsMessage.content)

        const content = requirementsMessage.content
        const functionalMatch = content.match(/Functional Requirements([\s\S]*?)(?=Non-Functional Requirements|$)/i)
        const nonFunctionalMatch = content.match(/Non-Functional Requirements([\s\S]*?)$/i)
        const parseFRs = (text: string) => {
          const lines = text.split('\n').filter(l => l.trim().match(/^(FR|NFR)\d+/))
          return lines.map((line, idx) => ({ id: `req_${idx + 1}`, description: line.trim() }))
        }
        await fetch(`http://localhost:8000/projects/${project_id}/requirements`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            functional_requirements: functionalMatch ? parseFRs(functionalMatch[1]) : [],
            non_functional_requirements: nonFunctionalMatch ? parseFRs(nonFunctionalMatch[1]) : []
          })
        })
        console.log('✅ Requirements saved to MongoDB!')
      }
    } catch (error) {
      console.error('Error saving to MongoDB:', error)
    }

    setMessages(prev => prev.map(msg =>
      msg.status === 'awaiting_approval' ? { ...msg, status: 'complete' } : msg
    ))

    const projectName = searchParams.get('name') || ''
    const projectDescription = searchParams.get('description') || ''

    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: 'Design Architect',
        content: 'Extracting Design',
        timestamp: new Date(),
        status: 'thinking'
      }])
      generateDesign(projectName, projectDescription, savedRequirements, savedProjectId)
    }, 500)
  }

  const handleDisapprove = () => {
    setShowApproval(false)
    setFeedbackEnabled(true)
    setMessages(prev => prev.map(msg =>
      msg.status === 'awaiting_approval' ? { ...msg, status: 'complete' } : msg
    ))
  }

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedback.trim() || !feedbackEnabled) return
    setMessages(prev => [...prev, { role: 'user', content: feedback, timestamp: new Date() }])
    setFeedbackEnabled(false)
    setIsGenerating(true)
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: 'Requirement Analyst',
        content: 'Updating requirements based on your feedback',
        timestamp: new Date(),
        status: 'thinking'
      }])
      refineRequirements(feedback)
    }, 500)
    setFeedback('')
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      <div className="absolute inset-0 bg-black" />
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <div className="border-b border-gray-800 bg-black/50 backdrop-blur-sm p-4">
          <div className="flex items-center space-x-2">
            <img src="/images/AgenticSDLCLogo.png" alt="Logo" width={32} height={32} className="object-contain" />
            <h1 className="text-xl font-medium text-white">AgenticSDLC</h1>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 pb-32" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message, index) => (
              <div key={index} className="flex items-start space-x-3">
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
                        src={message.agent === 'Design Architect' ? '/images/GeminiLogo.png' : '/images/Chat-GPT-icon.png'}
                        alt="AI"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-white font-semibold mb-2">
                    {message.role === 'user' ? 'User' : message.agent}
                  </div>
                  <div className="bg-black/80 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4">
                    <div className="text-gray-300">
                      {message.status === 'thinking' ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm italic">{message.content}</span>
                          <div className="flex space-x-1">
                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      ) : message.agent === 'Design Architect' && message.structured_data ? (
                        <div>
                          <p className="text-sm text-gray-400 mb-4">UML diagrams generated based on approved requirements.</p>
                          <PlantUMLDiagram code={message.structured_data.use_case_diagram || ''} title="Use Case Diagram" />
                          <PlantUMLDiagram code={message.structured_data.class_diagram || ''} title="Class Diagram" />
                        </div>
                      ) : message.agent === 'Developer' && message.structured_data?.technologies ? (
                        // ✅ NEW: Developer Agent output display
                        <div>
                          <p className="text-sm text-gray-400 mb-4">
                            Technology stack recommended based on your project requirements and design.
                          </p>
                          {/* Technologies badges */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {message.structured_data.technologies?.map((tech, i) => (
                              <span
                                key={i}
                                className="px-3 py-1 bg-purple-900/50 border border-purple-700/50 text-purple-300 text-xs rounded-full"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                          {/* Full content */}
                          <div
                            className="whitespace-pre-wrap text-sm"
                            dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
                          />
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }} />
                      )}
                    </div>
                    {message.status === 'awaiting_approval' && showApproval && (
                      <div className="mt-6 flex items-center justify-end space-x-3">
                        <p className="text-sm text-gray-400 mr-auto">Are you satisfied with these requirements?</p>
                        <button onClick={handleApprove} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm">Approve</button>
                        <button onClick={handleDisapprove} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm">Disapprove</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Fixed Bottom */}
        <div className="fixed bottom-0 left-[21.5rem] right-0 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-6">
          <div className="max-w-4xl mx-auto px-6">
            <form onSubmit={handleSendFeedback} className="mb-4">
              <div className={`relative bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-3xl overflow-hidden shadow-lg ${!feedbackEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder={feedbackEnabled ? "Provide your feedback..." : "Message AgenticSDLC..."}
                    disabled={!feedbackEnabled}
                    className="flex-1 px-6 py-4 bg-transparent text-white placeholder-gray-500 focus:outline-none disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={!feedback.trim() || !feedbackEnabled}
                    className="mr-3 p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full transition"
                  >
                    <svg width="20" height="20" fill="white" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
                </div>
                {isGenerating && (
                  <div className="px-6 pb-3">
                    <button type="button" onClick={handleStop} className="flex items-center space-x-2 text-red-500 hover:text-red-400 transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                      <span className="text-sm font-medium">Stop</span>
                    </button>
                  </div>
                )}
              </div>
            </form>
            <p className="text-center text-xs text-gray-500">
              AgenticSDLC may produce inaccurate results. Treat all responses as drafts requiring verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-2 mb-1 text-white">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-2 mb-1 text-white">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mb-2 text-white">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\n\n/g, '<br/>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 mb-1">• $1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 mb-1">$1. $2</li>')
}