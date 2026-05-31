'use client'
import { useState, useEffect, useRef, useContext } from 'react'
import { useSearchParams } from 'next/navigation'
import { Message } from '@/types/chat'
import { useChat } from '@/hooks/useChat'
import { PlantUMLDiagram } from '@/components/messages/DiagramMessage'
import { DocumentMessage } from '@/components/messages/DocumentMessage'
import { ChatInput } from '@/components/chat/ChatInput'
import Plasma from '@/components/ui/Plasma'
import { UserNameContext, IsAgentRunningContext } from '@/app/dashboard/layout'

function formatMarkdown(text: string): string {
  if (!text) return ''
  const lines = text.split('\n')
  let html = '', inTable = false, tableRows: string[] = []

  const flushTable = () => {
    if (tableRows.length < 2) { tableRows = []; inTable = false; return }
    const headers = tableRows[0].split('|').filter(c => c.trim()).map(c => `<th class="px-3 py-2 text-left text-xs font-semibold text-gray-300 border-b border-gray-600">${c.trim()}</th>`)
    const rows = tableRows.slice(2).map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => `<td class="px-3 py-2 text-xs text-gray-300 border-b border-gray-700/50">${c.trim()}</td>`)
      return `<tr class="hover:bg-white/5">${cells.join('')}</tr>`
    })
    html += `<div class="overflow-x-auto my-3"><table class="w-full border-collapse bg-gray-800/50 rounded-lg overflow-hidden"><thead><tr>${headers.join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`
    tableRows = []; inTable = false
  }

  const applyInline = (s: string) =>
    s.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
     .replace(/`(.+?)`/g, '<code class="bg-gray-700 px-1 rounded text-purple-300 text-xs">$1</code>')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim().startsWith('|')) { inTable = true; tableRows.push(line); continue }
    if (inTable) flushTable()
    if (line.startsWith('# '))    { html += `<h1 class="text-xl font-bold mt-4 mb-2 text-white">${applyInline(line.slice(2))}</h1>`; continue }
    if (line.startsWith('## '))   { html += `<h2 class="text-lg font-bold mt-4 mb-2 text-purple-300">${applyInline(line.slice(3))}</h2>`; continue }
    if (line.startsWith('### '))  { html += `<h3 class="text-base font-semibold mt-3 mb-1 text-purple-400">${applyInline(line.slice(4))}</h3>`; continue }
    if (line.startsWith('#### ')) { html += `<h4 class="text-sm font-semibold mt-2 mb-1 text-gray-300">${applyInline(line.slice(5))}</h4>`; continue }
    if (line.trim() === '---')    { html += `<hr class="border-gray-700 my-3"/>`; continue }
    if (line.trim().startsWith('```')) { continue }
    if (line.trim() === '•') {
      const content = applyInline((lines[i + 1] || '').replace(/^\*/, '').trim())
      html += `<div class="flex items-start space-x-2 my-1 ml-2"><span class="text-purple-400 mt-0.5 shrink-0">•</span><span class="text-gray-300 text-sm">${content}</span></div>`
      i++; continue
    }
    if (line.match(/^[•\-\*]\s+\S/)) {
      html += `<div class="flex items-start space-x-2 my-1 ml-2"><span class="text-purple-400 mt-0.5 shrink-0">•</span><span class="text-gray-300 text-sm">${applyInline(line.replace(/^[•\-\*]\s+/, ''))}</span></div>`
      continue
    }
    if (line.match(/^\d+\.\s/)) { html += `<div class="ml-4 my-1 text-gray-300 text-sm">${applyInline(line)}</div>`; continue }
    if (line.trim() === '') { html += `<div class="my-1"></div>`; continue }
    html += `<p class="text-gray-300 text-sm my-0.5">${applyInline(line)}</p>`
  }
  if (inTable) flushTable()
  return html
}

export default function ChatPage() {
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [showApproval, setShowApproval] = useState(false)
  const [feedbackEnabled, setFeedbackEnabled] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isChatLocked, setIsChatLocked] = useState(false)
  const [isProjectCompleted, setIsProjectCompleted] = useState(false)
  const [projectId, setProjectId] = useState<string>('')
  const [approvedRequirements, setApprovedRequirements] = useState<string>('')
  const [currentProjectName, setCurrentProjectName] = useState('')
  const [currentProjectDescription, setCurrentProjectDescription] = useState('')
  const [showHomeForm, setShowHomeForm] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const userName = useContext(UserNameContext)
  const setIsAgentRunning = useContext(IsAgentRunningContext)
  const chat = useChat({ setMessages, setIsGenerating, setShowApproval, setIsChatLocked, setIsProjectCompleted, abortControllerRef })

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Sync generating state with layout so it can intercept navigation
  // Also block navigation during approval — isGenerating is false at that point but session is still active
  useEffect(() => { setIsAgentRunning(isGenerating || showApproval) }, [isGenerating, showApproval])

  // Handle force-stop from layout when user confirms leaving mid-generation
  useEffect(() => {
    const handleForceStop = () => {
      abortControllerRef.current?.abort()
      setIsGenerating(false)
      setIsChatLocked(false)
      setShowApproval(false)
    }
    window.addEventListener('force-stop-agents', handleForceStop)
    return () => window.removeEventListener('force-stop-agents', handleForceStop)
  }, [])

  const [showStopSessionModal, setShowStopSessionModal] = useState(false)
  const [formError, setFormError] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedIndex(index)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopiedIndex(null), 2000)
    })
  }

  const [isReady, setIsReady] = useState(false)
  useEffect(() => { setIsReady(true) }, [])

  useEffect(() => {
    if (!isReady) return
    const projectIdFromUrl   = searchParams.get('project_id')
    const projectName        = searchParams.get('name')
    const projectDescription = searchParams.get('description')

    if (projectIdFromUrl) {
      setShowHomeForm(false)
      loadExistingProject(projectIdFromUrl)
      return
    }
    if (projectName && projectDescription) {
      setShowHomeForm(false)
      setCurrentProjectName(projectName)
      setCurrentProjectDescription(projectDescription)
      setMessages([
        { role: 'user', content: projectDescription, timestamp: new Date() },
        { role: 'agent', agent: 'Requirement Analyst', content: 'Extracting Requirements', timestamp: new Date(), status: 'thinking' }
      ])
      setProjectId(''); setIsChatLocked(false); setIsProjectCompleted(false)
      setShowApproval(false); setFeedback(''); setFeedbackEnabled(false)
      chat.generateRequirements(projectName, projectDescription)
      return
    }
    setMessages([]); setProjectId(''); setApprovedRequirements('')
    setCurrentProjectName(''); setCurrentProjectDescription('')
    setIsChatLocked(false); setIsProjectCompleted(false)
    setShowApproval(false); setFeedback(''); setFeedbackEnabled(false)
    setIsGenerating(false); setShowHomeForm(true)
  }, [searchParams, isReady])

  const isGibberish = (text: string): boolean => {
    if (text.length < 15) return true
    const words = text.trim().split(/\s+/)
    if (words.length < 3) return true
    // Check ratio of consonant clusters (gibberish tends to have very few vowels)
    const vowels = (text.match(/[aeiou]/gi) || []).length
    const letters = (text.match(/[a-z]/gi) || []).length
    if (letters > 0 && vowels / letters < 0.1) return true
    return false
  }

  const handleHomeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    const form  = e.target as HTMLFormElement
    const title = (form.elements.namedItem('title') as HTMLInputElement).value.trim()
    const desc  = (form.elements.namedItem('description') as HTMLTextAreaElement).value.trim()
    if (!title || !desc) { setFormError('Please fill in both fields.'); return }
    if (isGibberish(desc))  { setFormError('Please describe your project in a few sentences so the agents can understand it.'); return }
    setShowHomeForm(false)
    setCurrentProjectName(title)
    setCurrentProjectDescription(desc)
    setMessages([
      { role: 'user', content: desc, timestamp: new Date() },
      { role: 'agent', agent: 'Requirement Analyst', content: 'Extracting Requirements', timestamp: new Date(), status: 'thinking' }
    ])
    chat.generateRequirements(title, desc)
  }

  const loadExistingProject = async (projId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/projects/${projId}`)
      if (!response.ok) throw new Error('Failed to load project')
      const project = await response.json()
      setProjectId(projId)
      const loaded: Message[] = []
      if (project.description) loaded.push({ role: 'user', content: project.description, timestamp: new Date(project.created_at || Date.now()) })
      if (project.requirements) {
        const text = ['## Approved Requirements', '', '### Functional Requirements', ...(project.requirements.functional_requirements || []).map((r: any) => r.description), '', '### Non-Functional Requirements', ...(project.requirements.non_functional_requirements || []).map((r: any) => r.description)].join('\n')
        loaded.push({ role: 'agent', agent: 'Requirement Analyst', content: text, timestamp: new Date(project.updated_at || Date.now()), status: 'complete' })
      }
      if (project.design) loaded.push({ role: 'agent', agent: 'Design Architect', content: project.design.raw_content || 'Design generated.', timestamp: new Date(project.updated_at || Date.now()), status: 'complete', structured_data: { use_case_diagram: project.design.use_case_diagram || '', class_diagram: project.design.class_diagram || '' } })
      if (project.tech_stack) loaded.push({ role: 'agent', agent: 'Developer', content: project.tech_stack.content || 'Technology stack generated.', timestamp: new Date(project.updated_at || Date.now()), status: 'complete', structured_data: project.tech_stack.structured_data || {} })
      if (project.test_strategy) loaded.push({ role: 'agent', agent: 'Software Tester', content: project.test_strategy.content || 'Test strategy generated.', timestamp: new Date(project.updated_at || Date.now()), status: 'complete', structured_data: project.test_strategy.structured_data || {} })
      const doc = project.document || project.final_document
      if (doc) {
        loaded.push({ role: 'agent', agent: 'Document Agent', content: doc.content || 'Final document generated.', timestamp: new Date(project.updated_at || Date.now()), status: 'complete', structured_data: doc.structured_data || {} })
        setIsChatLocked(true); setIsProjectCompleted(true)
      }
      setMessages(loaded)
    } catch (error) { console.error('Error loading existing project:', error) }
  }

  const refineRequirements = async (userFeedback: string) => {
    try {
      const original = messages.find(msg => msg.agent === 'Requirement Analyst' && msg.status !== 'thinking')?.content || ''
      const response = await fetch('http://localhost:8000/agents/refine-requirements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_name: currentProjectName, project_description: currentProjectDescription, original_requirements: original, user_feedback: userFeedback })
      })
      const data = await response.json()
      setMessages(prev => prev.map(msg => msg.status === 'thinking' && msg.agent === 'Requirement Analyst' ? { ...msg, content: data.content, status: 'awaiting_approval' } : msg))
      setShowApproval(true); setIsGenerating(false)
    } catch (error) { console.error('Error refining requirements:', error); setIsGenerating(false) }
  }

 const handleStop = () => {
  setShowStopSessionModal(true)
}

  const handleStopConfirm = () => {
    abortControllerRef.current?.abort()
    setIsGenerating(false)
    setIsChatLocked(false)
    setMessages(prev => prev.filter(msg => msg.status !== 'thinking'))
    setShowStopSessionModal(false)
  }

  const handleApprove = async () => {
    setShowApproval(false); setFeedbackEnabled(false)
    let savedProjectId = '', savedRequirements = ''
    try {
      const { createBrowserClient } = await import('@supabase/ssr')
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { alert('You must be logged in'); return }

      const projectResponse = await fetch(`http://localhost:8000/projects/?user_id=${encodeURIComponent(user.id)}&name=${encodeURIComponent(currentProjectName)}&description=${encodeURIComponent(currentProjectDescription)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      if (!projectResponse.ok) throw new Error('Failed to create project')
      const { project_id } = await projectResponse.json()
      savedProjectId = project_id; setProjectId(project_id)

      const reqMsg = messages.find(msg => msg.agent === 'Requirement Analyst' && msg.status === 'awaiting_approval')
      if (reqMsg) {
        savedRequirements = reqMsg.content; setApprovedRequirements(reqMsg.content)
        const content = reqMsg.content || ''
        const functionalMatch    = content.match(/Functional Requirements([\s\S]*?)(?=Non-Functional Requirements|$)/i)
        const nonFunctionalMatch = content.match(/Non-Functional Requirements([\s\S]*?)$/i)
        const parseFRs = (text: string) => text.split('\n').filter(l => l.trim().match(/^(FR|NFR)\d+/)).map((line, idx) => ({ id: `req_${idx + 1}`, description: line.trim() }))
        await fetch(`http://localhost:8000/projects/${project_id}/requirements`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ functional_requirements: functionalMatch ? parseFRs(functionalMatch[1]) : [], non_functional_requirements: nonFunctionalMatch ? parseFRs(nonFunctionalMatch[1]) : [] }) })
      }
    } catch (error) { console.error('Error saving to MongoDB:', error) }

    setMessages(prev => prev.map(msg => msg.status === 'awaiting_approval' ? { ...msg, status: 'complete' } : msg))
    chat.streamPipeline(currentProjectName, currentProjectDescription, savedRequirements, savedProjectId)
  }

  const handleDisapprove = () => {
    setShowApproval(false); setFeedbackEnabled(true)
    setMessages(prev => prev.map(msg => msg.status === 'awaiting_approval' ? { ...msg, status: 'complete' } : msg))
  }

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedback.trim() || !feedbackEnabled) return
    setMessages(prev => [...prev, { role: 'user', content: feedback, timestamp: new Date() }])
    setFeedbackEnabled(false); setIsGenerating(true)
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'agent', agent: 'Requirement Analyst', content: 'Updating requirements based on your feedback', timestamp: new Date(), status: 'thinking' }])
      refineRequirements(feedback)
    }, 500)
    setFeedback('')
  }

  const designMessage = messages.find(m => m.agent === 'Design Architect')

  return (
    <div className="flex flex-col h-screen w-full bg-black overflow-hidden">

      <div className="flex-1 overflow-hidden">
        {showHomeForm ? (

          /* ── Home form with Plasma background ─────────────────────── */
          <div className="relative h-full w-full overflow-hidden">
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
            <div className="relative z-10 flex h-full items-center justify-center p-8">
              <div className="w-full max-w-2xl space-y-8">
                <div className="text-center">
                  <div className="mb-4 flex items-center justify-center space-x-2">
                    <img src="/images/AgenticSDLCLogo.png" alt="AgenticSDLC Logo" width={70} height={52} className="object-contain" />
                    <h1 className="text-4xl font-medium tracking-wide text-white">AgenticSDLC</h1>
                  </div>
                </div>
                <form onSubmit={handleHomeSubmit} className="space-y-4" onChange={() => setFormError('')}>
                  <input
                    name="title"
                    type="text"
                    placeholder="Enter a project name"
                    className="w-full rounded-lg border border-gray-700/50 bg-gray-900/40 px-5 py-3 text-sm text-white placeholder-gray-500 transition focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                  />
                  <div className="relative">
                    <textarea
                      name="description"
                      placeholder="Ask our AI team to create a..."
                      rows={4}
                      className="w-full resize-none rounded-lg border border-gray-700/50 bg-gray-900/40 px-5 py-3 pr-14 text-sm text-white placeholder-gray-500 transition focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                    />
                    {formError && (
                    <p className="text-xs text-red-400 mt-1">{formError}</p>
                  )}
                  <button type="submit" className="absolute bottom-3 right-3 rounded-md bg-purple-600/80 p-2 transition duration-200 hover:bg-purple-600">
                      <svg width="18" height="18" fill="white" viewBox="0 0 20 20" className="rotate-45">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                      </svg>
                    </button>
                  </div>
                </form>
                <p className="text-center text-xs text-gray-500">AgenticSDLC may produce inaccurate results. Treat all responses as drafts requiring verification.</p>
              </div>
            </div>
          </div>

        ) : (

          /* ── Messages list ─────────────────────────────────────────── */
          <div className="h-full overflow-y-auto p-6 pb-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message, index) => (
                <div key={index} className="group flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {message.role === 'user' ? (
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden">
                        <img src={message.agent === 'Design Architect' || message.agent === 'Document Agent' ? '/images/GeminiLogo.png' : '/images/Chat-GPT-icon.png'} alt="AI" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="text-white font-semibold mb-2">{message.role === 'user' ? userName : message.agent}</div>
                    <div className="bg-black/80 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4">
                      <div className="text-gray-300">
                        {message.status === 'thinking' ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm italic">{message.content}</span>
                            <div className="flex space-x-1">
                              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" />
                              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                          </div>
                        ) : message.agent === 'Design Architect' && message.structured_data ? (
                          <div>
                            <p className="text-sm text-gray-400 mb-4">UML diagrams generated based on approved requirements.</p>
                            <PlantUMLDiagram code={message.structured_data.use_case_diagram || ''} title="Use Case Diagram" />
                            <PlantUMLDiagram code={message.structured_data.class_diagram    || ''} title="Class Diagram" />
                          </div>
                        ) : message.agent === 'Developer' && message.structured_data?.technologies ? (
                          <div>
                            <p className="text-sm text-gray-400 mb-4">Technology stack recommended based on your project requirements and design.</p>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {message.structured_data.technologies?.map((tech, i) => (
                                <span key={i} className="px-3 py-1 bg-purple-900/50 border border-purple-700/50 text-purple-300 text-xs rounded-full">{tech}</span>
                              ))}
                            </div>
                            <div className="whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }} />
                          </div>
                        ) : message.agent === 'Document Agent' ? (
                          message.failed ? (
                            <p className="text-sm text-red-400">{message.content}</p>
                          ) : (
                            <DocumentMessage
                              content={message.content}
                              useCaseDiagram={designMessage?.structured_data?.use_case_diagram || ''}
                              classDiagram={designMessage?.structured_data?.class_diagram || ''}
                            />
                          )
                        ) : (
                          <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }} />
                        )}
                      </div>

                      {message.status === 'awaiting_approval' && showApproval && (
                       <div className="mt-6 border-t border-gray-700 pt-4">
                       <p className="text-sm font-bold text-white mb-3">Are you satisfied with these requirements?</p>
                       <div className="flex items-center space-x-3">
                         <button onClick={handleApprove}    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm font-medium">Approve</button>
                         <button onClick={handleDisapprove} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition text-sm font-medium">Disapprove</button>
                       </div>
                     </div>
                      )}
                    </div>

                    {/* Copy button — agent messages only, ChatGPT style */}
                    {message.role === 'agent' && message.status !== 'thinking' && message.content && (
                      <div className="flex items-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopyMessage(message.content, index)}
                          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition"
                          title="Copy message"
                        >
                          {copiedIndex === index ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-green-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-4 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom input — only show when not on home form */}
      {!showHomeForm && (
        <ChatInput
          feedback={feedback}
          feedbackEnabled={feedbackEnabled}
          isChatLocked={isChatLocked}
          isGenerating={isGenerating}
          onChange={setFeedback}
          onSubmit={handleSendFeedback}
          onStop={handleStop}
        />
      )}

      {/* Stop confirmation modal */}
      {showStopSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowStopSessionModal(false)} />
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{ background: 'linear-gradient(160deg, #1a0035 0%, #0d0018 100%)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="mb-1 text-base font-semibold text-white">Stop generating?</h3>
            <p className="mb-6 text-sm text-white/50 leading-relaxed">
              Are you sure you want to stop the message?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowStopSessionModal(false)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/8 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleStopConfirm}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Stop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}