'use client'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const plantumlEncoder = require('plantuml-encoder')

interface Message {
  role: 'user' | 'agent'
  agent?: string
  content: string
  timestamp: Date
  status?: 'thinking' | 'complete' | 'awaiting_approval'
  failed?: boolean
  structured_data?: {
    use_case_diagram?: string
    class_diagram?: string
    diagrams_count?: number
    frontend?: string
    backend?: string
    database?: string
    external_integrations?: string
    stack_summary?: string
    technologies?: string[]
    title?: string
    sections?: string[]
    word_count?: number
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

// ─── PlantUMLDiagram for the white document export panel ────────────────────
function PlantUMLDiagramDoc({ code, title }: { code: string; title: string }) {
  const [imgError, setImgError] = useState(false)
  if (!code) return null
  try {
    const encoded = plantumlEncoder.encode(code)
    // Use PNG (not SVG) for the document panel.
    // PlantUML SVGs embed font-size in absolute pixels — the text does NOT shrink when
    // the <img> is resized via CSS, so class labels overflow/clip inside diagram boxes.
    // PNG is a raster image: every pixel (including text) scales uniformly with width:100%.
    const url = `https://www.plantuml.com/plantuml/png/${encoded}`
    return (
      <div style={{ marginBottom: '16px' }} data-diagram-container="true">
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#444', marginBottom: '8px' }}>{title}</p>
        {imgError ? (
          <pre style={{ fontSize: '11px', color: '#555', background: '#f5f5f5', padding: '8px', borderRadius: '4px', whiteSpace: 'pre-wrap', overflow: 'hidden' }}>
            {code}
          </pre>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '6px', padding: '8px', overflow: 'hidden' }}>
            <img
              src={url}
              alt={title}
              style={{ width: '100%', height: 'auto', display: 'block', maxWidth: '100%' }}
              onError={() => setImgError(true)}
            />
          </div>
        )}
      </div>
    )
  } catch (e) {
    return (
      <pre style={{ fontSize: '11px', color: '#555', background: '#f5f5f5', padding: '8px', borderRadius: '4px', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
        {code}
      </pre>
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
  const [isChatLocked, setIsChatLocked] = useState(false)
  const [isProjectCompleted, setIsProjectCompleted] = useState(false)
  const [projectId, setProjectId] = useState<string>('')
  const [approvedRequirements, setApprovedRequirements] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Stores the project name/description for the current session.
  // Set from URL params when the home-page form submits to /dashboard/chat?name=...&description=...
  const [currentProjectName, setCurrentProjectName]               = useState('')
  const [currentProjectDescription, setCurrentProjectDescription] = useState('')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const [isReady, setIsReady] = useState(false)

  useEffect(() => { setIsReady(true) }, [])

  useEffect(() => {
    if (!isReady) return

    const projectIdFromUrl = searchParams.get('project_id')
    const projectName = searchParams.get('name')
    const projectDescription = searchParams.get('description')

    if (projectIdFromUrl) {
      loadExistingProject(projectIdFromUrl)
      return
    }

    if (projectName && projectDescription) {
      setCurrentProjectName(projectName)
      setCurrentProjectDescription(projectDescription)
      setMessages([
        { role: 'user', content: projectDescription, timestamp: new Date() },
        {
          role: 'agent', agent: 'Requirement Analyst',
          content: 'Extracting Requirements', timestamp: new Date(), status: 'thinking'
        }
      ])
      setProjectId('')
      setIsChatLocked(false)
      setIsProjectCompleted(false)
      setShowApproval(false)
      setFeedback('')
      setFeedbackEnabled(false)
      generateRequirements(projectName, projectDescription)
      return
    }

    setMessages([])
    setProjectId('')
    setApprovedRequirements('')
    setCurrentProjectName('')
    setCurrentProjectDescription('')
    setIsChatLocked(false)
    setIsProjectCompleted(false)
    setShowApproval(false)
    setFeedback('')
    setFeedbackEnabled(false)
    setIsGenerating(false)
  }, [searchParams, isReady])

  // ─────────────────────────────────────────────────────────────────────────
  // Agent pipeline
  // ─────────────────────────────────────────────────────────────────────────

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
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || `Request failed with status ${response.status}`)
      }
      const data = await response.json()
      setMessages(prev =>
        prev.map(msg =>
          msg.status === 'thinking' && msg.agent === 'Requirement Analyst'
            ? { ...msg, content: data.content || 'Failed to generate requirements.', status: 'awaiting_approval' }
            : msg
        )
      )
      setShowApproval(true)
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessages(prev => prev.filter(msg => msg.status !== 'thinking'))
      } else {
        setMessages(prev =>
          prev.map(msg =>
            msg.status === 'thinking' && msg.agent === 'Requirement Analyst'
              ? { ...msg, content: `Failed to generate requirements: ${error.message || 'Unknown error'}`, status: 'complete', failed: true }
              : msg
          )
        )
        setShowApproval(false)
      }
    } finally {
      setIsGenerating(false)
    }
  }

  // FIX: extracting useCaseDiagram & classDiagram and threading them through
  //      the entire pipeline so Gemini (document agent) receives the real codes.
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
          context: { requirements }
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
      }

      // ── FIX: pass diagram PlantUML codes down the pipeline ──────────────
      const designContent      = data.content || ''
      const useCaseDiagram     = data.structured_data?.use_case_diagram || ''
      const classDiagram       = data.structured_data?.class_diagram    || ''

      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'agent', agent: 'Developer',
          content: 'Recommending Technology Stack', timestamp: new Date(), status: 'thinking'
        }])
        generateTechStack(name, description, requirements, designContent, projId, useCaseDiagram, classDiagram)
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

  const generateTechStack = async (
    name: string,
    description: string,
    requirements: string,
    design: string,
    projId: string,
    useCaseDiagram: string,   // threaded through
    classDiagram: string
  ) => {
    setIsGenerating(true)
    try {
      const response = await fetch('http://localhost:8000/agents/generate-tech-stack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: name,
          project_description: description,
          context: { requirements, design, project_id: projId }
        })
      })
      const data = await response.json()

      setMessages(prev => prev.map(msg =>
        msg.status === 'thinking' && msg.agent === 'Developer'
          ? { ...msg, content: data.content, status: 'complete', structured_data: data.structured_data }
          : msg
      ))

      if (projId) {
        await fetch(`http://localhost:8000/projects/${projId}/tech-stack`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: data.content, structured_data: data.structured_data })
        })
      }

      const techStackContent = data.content || ''
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'agent', agent: 'Software Tester',
          content: 'Generating Test Strategy', timestamp: new Date(), status: 'thinking'
        }])
        generateTestStrategy(name, description, requirements, design, techStackContent, projId, useCaseDiagram, classDiagram)
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
    projId: string,
    useCaseDiagram: string,   // threaded through
    classDiagram: string
  ) => {
    setIsGenerating(true)
    try {
      const response = await fetch('http://localhost:8000/agents/generate-test-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: name,
          project_description: description,
          context: { requirements, design, tech_stack: techStack, project_id: projId }
        })
      })
      const data = await response.json()

      setMessages(prev => prev.map(msg =>
        msg.status === 'thinking' && msg.agent === 'Software Tester'
          ? { ...msg, content: data.content, status: 'complete', structured_data: data.structured_data }
          : msg
      ))

      if (projId) {
        await fetch(`http://localhost:8000/projects/${projId}/test-strategy`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: data.content, structured_data: data.structured_data })
        })
      }

      const testStrategyContent = data.content || ''
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'agent', agent: 'Document Agent',
          content: 'Generating Final SDLC Document', timestamp: new Date(), status: 'thinking'
        }])
        generateFinalDocument(name, description, requirements, design, techStack, testStrategyContent, projId, useCaseDiagram, classDiagram)
      }, 500)

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

  const generateFinalDocument = async (
    name: string,
    description: string,
    requirements: string,
    design: string,
    techStack: string,
    testStrategy: string,
    projId: string,
    useCaseDiagram: string,   // FIX: now forwarded to Gemini
    classDiagram: string
  ) => {
    setIsGenerating(true)
    try {
      const response = await fetch('http://localhost:8000/agents/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: name,
          project_description: description,
          context: {
            requirements,
            design,
            use_case_diagram: useCaseDiagram,  // FIX: was missing
            class_diagram: classDiagram,         // FIX: was missing
            tech_stack: techStack,
            test_strategy: testStrategy,
            project_id: projId
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || 'Failed to generate final document')
      }

      const data = await response.json()

      setMessages(prev => prev.map(msg =>
        msg.status === 'thinking' && msg.agent === 'Document Agent'
          ? { ...msg, content: data.content, status: 'complete', structured_data: data.structured_data }
          : msg
      ))

      if (projId) {
        await fetch(`http://localhost:8000/projects/${projId}/final-document`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: data.content, structured_data: data.structured_data })
        })
        await fetch(`http://localhost:8000/projects/${projId}/complete`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }
        })
        window.dispatchEvent(new Event('completed-chats-updated'))
      }

      setIsProjectCompleted(true)
      setIsChatLocked(true)
      setFeedbackEnabled(false)

    } catch (error) {
      console.error('Error generating final document:', error)
      setMessages(prev => prev.map(msg =>
        msg.status === 'thinking' && msg.agent === 'Document Agent'
          ? {
              ...msg,
              content: `Failed to generate final document: ${error instanceof Error ? error.message : 'Unknown error'}`,
              status: 'complete',
              failed: true
            }
          : msg
      ))
    } finally {
      setIsGenerating(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Load existing project
  // ─────────────────────────────────────────────────────────────────────────

  const loadExistingProject = async (projectId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/projects/${projectId}`)
      if (!response.ok) throw new Error('Failed to load project')
      const project = await response.json()
      setProjectId(projectId)

      const loadedMessages: Message[] = []

      if (project.description) {
        loadedMessages.push({
          role: 'user', content: project.description,
          timestamp: new Date(project.created_at || Date.now())
        })
      }
      if (project.requirements) {
        const requirementsContent = [
          '## Approved Requirements', '',
          '### Functional Requirements',
          ...(project.requirements.functional_requirements || []).map((r: any) => r.description),
          '', '### Non-Functional Requirements',
          ...(project.requirements.non_functional_requirements || []).map((r: any) => r.description),
        ].join('\n')
        loadedMessages.push({
          role: 'agent', agent: 'Requirement Analyst', content: requirementsContent,
          timestamp: new Date(project.updated_at || Date.now()), status: 'complete'
        })
      }
      if (project.design) {
        loadedMessages.push({
          role: 'agent', agent: 'Design Architect',
          content: project.design.raw_content || 'Design generated.',
          timestamp: new Date(project.updated_at || Date.now()), status: 'complete',
          structured_data: {
            use_case_diagram: project.design.use_case_diagram || '',
            class_diagram: project.design.class_diagram || ''
          }
        })
      }
      if (project.tech_stack) {
        loadedMessages.push({
          role: 'agent', agent: 'Developer',
          content: project.tech_stack.content || 'Technology stack generated.',
          timestamp: new Date(project.updated_at || Date.now()), status: 'complete',
          structured_data: project.tech_stack.structured_data || {}
        })
      }
      if (project.test_strategy) {
        loadedMessages.push({
          role: 'agent', agent: 'Software Tester',
          content: project.test_strategy.content || 'Test strategy generated.',
          timestamp: new Date(project.updated_at || Date.now()), status: 'complete',
          structured_data: project.test_strategy.structured_data || {}
        })
      }
      if (project.final_document) {
        loadedMessages.push({
          role: 'agent', agent: 'Document Agent',
          content: project.final_document.content || 'Final document generated.',
          timestamp: new Date(project.updated_at || Date.now()), status: 'complete',
          structured_data: project.final_document.structured_data || {}
        })
        setIsChatLocked(true)
        setIsProjectCompleted(true)
      }

      setMessages(loadedMessages)
    } catch (error) {
      console.error('Error loading existing project:', error)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Requirements refinement
  // ─────────────────────────────────────────────────────────────────────────

  const refineRequirements = async (userFeedback: string) => {
    try {
      const originalRequirements = messages.find(
        msg => msg.agent === 'Requirement Analyst' && msg.status !== 'thinking'
      )?.content || ''
      const projectName        = currentProjectName
      const projectDescription = currentProjectDescription
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

  // ─────────────────────────────────────────────────────────────────────────
  // UI handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsGenerating(false)
      setMessages(prev => prev.filter(msg => msg.status !== 'thinking'))
    }
  }

  // ─── PDF EXPORT ─────────────────────────────────────────────────────────
  //
  // Two-pass approach:
  //   Pass 1 — expand the element, measure where every diagram container sits,
  //            and inject marginTop on any that straddle a page boundary so
  //            the whole diagram lands cleanly on the next page.
  //   Pass 2 — capture with html2canvas and slice into PDF pages using white
  //            rectangle masks on every margin zone (eliminates the overlap /
  //            repeat bug where the same content appeared at the bottom of
  //            page N and the top of page N+1).
  //
  const handleExportPDF = async () => {
    const element = document.getElementById('final-document-export')
    if (!element) return

    // Save originals so we can restore everything after capture
    const origMaxHeight = element.style.maxHeight
    const origOverflow  = element.style.overflow
    const origHeight    = element.style.height
    const origWidth     = element.style.width

    // Expand the div fully
    element.style.maxHeight = 'none'
    element.style.overflow  = 'hidden'
    element.style.height    = 'auto'
    element.style.width     = '800px'

    await new Promise(resolve => setTimeout(resolve, 400))

    // PDF geometry constants
    const pageWidth  = 210   // mm (A4)
    const pageHeight = 297   // mm (A4)
    const margin     = 20    // mm on every side
    const usableWmm  = pageWidth  - margin * 2   // 170 mm
    const usableHmm  = pageHeight - margin * 2   // 257 mm

    // Convert usableH from mm to CSS pixels.
    // The element is 800px wide → that maps to usableWmm (170mm) in the PDF.
    // So 1 CSS px = usableWmm/800 mm, and usableH in px = usableHmm * 800 / usableWmm.
    const usableHpx = (usableHmm * 800) / usableWmm   // ≈ 1210 px

    // Track modified containers so we can restore them in finally
    const modified: { el: HTMLElement; was: string }[] = []

    try {
      // ── Pass 1: prevent diagrams from splitting across pages ─────────
      const diagrams = Array.from(
        element.querySelectorAll('[data-diagram-container]')
      ) as HTMLElement[]

      for (const diagram of diagrams) {
        // Re-read elementRect each iteration — previous padding shifts could
        // theoretically affect the element's own viewport position.
        const elRect  = element.getBoundingClientRect()
        const dgRect  = diagram.getBoundingClientRect()

        const relTop    = dgRect.top    - elRect.top   // px from element top
        const relBottom = dgRect.bottom - elRect.top

        // Skip if the diagram is taller than one full page (can't fix that case)
        if (relBottom - relTop >= usableHpx) continue

        const pageOfTop    = Math.floor(relTop    / usableHpx)
        const pageOfBottom = Math.floor(relBottom / usableHpx)

        if (pageOfTop !== pageOfBottom) {
          // This diagram straddles a page boundary — push it to the next page
          const nextPageTopPx   = (pageOfTop + 1) * usableHpx
          const paddingNeededPx = Math.ceil(nextPageTopPx - relTop) + 4  // +4 px safety

          modified.push({ el: diagram, was: diagram.style.marginTop })
          diagram.style.marginTop = `${paddingNeededPx}px`

          // Let the browser reflow before measuring the next diagram
          await new Promise(r => setTimeout(r, 100))
        }
      }

      // Final settle after all padding adjustments
      await new Promise(resolve => setTimeout(resolve, 200))

      // ── Pass 2: capture and build the PDF ────────────────────────────
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: 800,
        windowWidth: 800,
      })

      const imgData   = canvas.toDataURL('image/png')
      const pdf       = new jsPDF('p', 'mm', 'a4')
      const imgWidth  = usableWmm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position   = margin
      let firstPage  = true

      while (heightLeft > 0) {
        if (!firstPage) pdf.addPage()

        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)

        // White masks on all four margin zones.
        // The bottom mask is the critical one: it hides the 20mm bleed that
        // would otherwise show at the bottom of page N AND the top of page N+1.
        pdf.setFillColor(255, 255, 255)
        pdf.rect(0,                  0,                   pageWidth,    margin + 1, 'F') // top
        pdf.rect(0,                  pageHeight - margin, pageWidth,    margin + 1, 'F') // bottom
        pdf.rect(0,                  0,                   margin,       pageHeight, 'F') // left
        pdf.rect(pageWidth - margin, 0,                   margin + 1,   pageHeight, 'F') // right

        heightLeft -= usableHmm
        position    = margin - (imgHeight - heightLeft)
        firstPage   = false
      }

      pdf.save('SDLC_Document.pdf')

    } catch (error) {
      console.error('Error exporting PDF:', error)
    } finally {
      // Restore original styles and any margins we injected
      element.style.maxHeight = origMaxHeight
      element.style.overflow  = origOverflow
      element.style.height    = origHeight
      element.style.width     = origWidth
      for (const { el, was } of modified) {
        el.style.marginTop = was
      }
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

      const projectName        = currentProjectName
      const projectDescription = currentProjectDescription

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

        const content = requirementsMessage?.content || ''
        if (!content) { console.error('Requirements content is missing'); return }

        const functionalMatch    = content.match(/Functional Requirements([\s\S]*?)(?=Non-Functional Requirements|$)/i)
        const nonFunctionalMatch = content.match(/Non-Functional Requirements([\s\S]*?)$/i)
        const parseFRs = (text: string) => {
          const lines = text.split('\n').filter(l => l.trim().match(/^(FR|NFR)\d+/))
          return lines.map((line, idx) => ({ id: `req_${idx + 1}`, description: line.trim() }))
        }
        await fetch(`http://localhost:8000/projects/${project_id}/requirements`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            functional_requirements: functionalMatch     ? parseFRs(functionalMatch[1])    : [],
            non_functional_requirements: nonFunctionalMatch ? parseFRs(nonFunctionalMatch[1]) : []
          })
        })
      }
    } catch (error) {
      console.error('Error saving to MongoDB:', error)
    }

    setMessages(prev => prev.map(msg =>
      msg.status === 'awaiting_approval' ? { ...msg, status: 'complete' } : msg
    ))

    const projectName        = currentProjectName
    const projectDescription = currentProjectDescription

    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'agent', agent: 'Design Architect',
        content: 'Extracting Design', timestamp: new Date(), status: 'thinking'
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
        role: 'agent', agent: 'Requirement Analyst',
        content: 'Updating requirements based on your feedback',
        timestamp: new Date(), status: 'thinking'
      }])
      refineRequirements(feedback)
    }, 500)
    setFeedback('')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Document helpers
  // ─────────────────────────────────────────────────────────────────────────

  const designMessage = messages.find(m => m.agent === 'Design Architect')

  /**
   * FIX: The original regex `/^\d+(\.\d+)?\.\s+/` required a trailing period,
   * so subsections like "5.1 Functional Requirements" or "6.1 Use Case Diagram"
   * were NEVER recognised as headings — they fell into their parent section's
   * body, diagrams were never injected, and content appeared missing.
   *
   * New regex `/^\d+\.(\d+\.?)?\s+/` correctly handles:
   *   "1. Introduction"             (top-level)
   *   "5.1 Functional Requirements" (subsection, no trailing period)
   *   "5.1. Functional Requirements"(subsection, with trailing period)
   */
  const splitDocumentSections = (text: string) => {
    if (!text) return []

    const lines = text.split('\n')
    const sections: { heading: string; content: string[] }[] = []
    let current: { heading: string; content: string[] } | null = null

    for (const line of lines) {
      if (/^\d+\.(\d+\.?)?\s+/.test(line.trim())) {
        if (current) sections.push(current)
        current = { heading: line.trim(), content: [] }
      } else {
        if (!current) current = { heading: '', content: [] }
        current.content.push(line)
      }
    }

    if (current) sections.push(current)
    return sections
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen w-full bg-black overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/50 backdrop-blur-sm p-4">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-medium text-white">AgenticSDLC</h1>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 pb-4">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* ── Messages list ─────────────────────────────────────────────── */}
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

                    {/* ── Thinking state ─────────────────────────────────── */}
                    {message.status === 'thinking' ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm italic">{message.content}</span>
                        <div className="flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" />
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>

                    /* ── Design Architect ────────────────────────────────── */
                    ) : message.agent === 'Design Architect' && message.structured_data ? (
                      <div>
                        <p className="text-sm text-gray-400 mb-4">UML diagrams generated based on approved requirements.</p>
                        <PlantUMLDiagram code={message.structured_data.use_case_diagram || ''} title="Use Case Diagram" />
                        <PlantUMLDiagram code={message.structured_data.class_diagram    || ''} title="Class Diagram" />
                      </div>

                    /* ── Developer ───────────────────────────────────────── */
                    ) : message.agent === 'Developer' && message.structured_data?.technologies ? (
                      <div>
                        <p className="text-sm text-gray-400 mb-4">
                          Technology stack recommended based on your project requirements and design.
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {message.structured_data.technologies?.map((tech, i) => (
                            <span key={i} className="px-3 py-1 bg-purple-900/50 border border-purple-700/50 text-purple-300 text-xs rounded-full">
                              {tech}
                            </span>
                          ))}
                        </div>
                        <div
                          className="whitespace-pre-wrap text-sm"
                          dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
                        />
                      </div>

                    /* ── Document Agent ──────────────────────────────────── */
                    ) : message.agent === 'Document Agent' ? (
                      message.failed ? (
                        <p className="text-sm text-red-400">{message.content}</p>
                      ) : (
                        <div>
                          {/* Toolbar */}
                          <div className="flex items-center justify-between mb-4 no-print">
                            <p className="text-sm text-gray-400">
                              Final SDLC document generated using all approved artifacts.
                            </p>
                            <button
                              onClick={handleExportPDF}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition"
                            >
                              Export PDF
                            </button>
                          </div>

                          {/* Document preview — white panel with scrollbar */}
                          <div
                            id="final-document-export"
                            className="bg-white text-black rounded-lg p-8 max-h-[600px] overflow-y-auto"
                            style={{ fontFamily: 'Georgia, "Times New Roman", serif', overflowX: 'hidden' }}
                          >
                            {splitDocumentSections(message.content).map((section, idx) => {
                              const fullText = [section.heading, ...section.content].join('\n')

                              /*
                               * FIX: Title rendering
                               * The title lands in the first section with heading:''.
                               * We pull the first non-empty line and render it bold + centered
                               * as required by the IEEE-style spec.
                               */
                              if (idx === 0 && !section.heading) {
                                const titleLine = section.content.find(l => l.trim())
                                if (!titleLine?.trim()) return null
                                return (
                                  <div key={idx} style={{ textAlign: 'center', marginBottom: '32px' }}>
                                    <strong style={{
                                      display: 'block',
                                      fontSize: '20px',
                                      fontWeight: 700,
                                      lineHeight: 1.4,
                                      color: '#000',
                                      letterSpacing: '0.02em'
                                    }}>
                                      {titleLine.trim()}
                                    </strong>
                                  </div>
                                )
                              }

                              return (
                                <div key={idx} style={{ marginBottom: '24px' }}>
                                  {/* Section text */}
                                  <div
                                    dangerouslySetInnerHTML={{ __html: formatDocumentMarkdown(fullText) }}
                                  />

                                  {/*
                                   * FIX: Diagrams are now injected correctly because the fixed
                                   * regex properly splits "6.1 Use Case Diagram" into its own
                                   * section — so section.heading.startsWith('6.1') is true.
                                   */}
                                  {section.heading.startsWith('6.1') && (
                                    <PlantUMLDiagramDoc
                                      code={designMessage?.structured_data?.use_case_diagram || ''}
                                      title="Use Case Diagram"
                                    />
                                  )}
                                  {section.heading.startsWith('6.2') && (
                                    <PlantUMLDiagramDoc
                                      code={designMessage?.structured_data?.class_diagram || ''}
                                      title="Class Diagram"
                                    />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )

                    /* ── All other agents ────────────────────────────────── */
                    ) : (
                      <div
                        className="whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
                      />
                    )}
                  </div>

                  {/* Approval buttons */}
                  {message.status === 'awaiting_approval' && showApproval && (
                    <div className="mt-6 flex items-center justify-end space-x-3">
                      <p className="text-sm text-gray-400 mr-auto">Are you satisfied with these requirements?</p>
                      <button onClick={handleApprove}    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm">Approve</button>
                      <button onClick={handleDisapprove} className="px-6 py-2 bg-gray-700  hover:bg-gray-600  text-white rounded-lg transition text-sm">Disapprove</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed Bottom Input */}
      <div className="bg-gradient-to-t from-black via-black/95 to-transparent pt-4 pb-6 px-6">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendFeedback} className="mb-4">
            <div className={`relative bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-3xl overflow-hidden shadow-lg ${(!feedbackEnabled || isChatLocked) ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <div className="flex items-center">
                <input
                  type="text"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={
                    isChatLocked
                      ? 'This chat is complete. Start a new chat from the sidebar.'
                      : feedbackEnabled
                        ? 'Provide your feedback...'
                        : 'Message AgenticSDLC...'
                  }
                  disabled={!feedbackEnabled || isChatLocked}
                  className="flex-1 px-6 py-4 bg-transparent text-white placeholder-gray-500 focus:outline-none disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!feedback.trim() || !feedbackEnabled || isChatLocked}
                  className="mr-3 p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full transition"
                >
                  <svg width="20" height="20" fill="white" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
              {isGenerating && !isChatLocked && (
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
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// formatMarkdown — for chat bubbles (dark background)
// ─────────────────────────────────────────────────────────────────────────────
function formatMarkdown(text: string): string {
  if (!text) return ''
  const lines = text.split('\n')
  let html = ''
  let inTable = false
  let tableRows: string[] = []

  const flushTable = () => {
    if (tableRows.length < 2) { tableRows = []; inTable = false; return }
    const headers = tableRows[0].split('|').filter(c => c.trim()).map(c =>
      `<th class="px-3 py-2 text-left text-xs font-semibold text-gray-300 border-b border-gray-600">${c.trim()}</th>`)
    const rows = tableRows.slice(2).map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c =>
        `<td class="px-3 py-2 text-xs text-gray-300 border-b border-gray-700/50">${c.trim()}</td>`)
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
      const nextLine = lines[i + 1] || ''
      const content = applyInline(nextLine.replace(/^\*/, '').trim())
      html += `<div class="flex items-start space-x-2 my-1 ml-2"><span class="text-purple-400 mt-0.5 shrink-0">•</span><span class="text-gray-300 text-sm">${content}</span></div>`
      i++; continue
    }
    if (line.match(/^[•\-\*]\s+\S/)) {
      const content = applyInline(line.replace(/^[•\-\*]\s+/, ''))
      html += `<div class="flex items-start space-x-2 my-1 ml-2"><span class="text-purple-400 mt-0.5 shrink-0">•</span><span class="text-gray-300 text-sm">${content}</span></div>`
      continue
    }
    if (line.match(/^\d+\.\s/)) {
      html += `<div class="ml-4 my-1 text-gray-300 text-sm">${applyInline(line)}</div>`
      continue
    }
    if (line.trim() === '') { html += `<div class="my-1"></div>`; continue }

    html += `<p class="text-gray-300 text-sm my-0.5">${applyInline(line)}</p>`
  }

  if (inTable) flushTable()
  return html
}

// ─────────────────────────────────────────────────────────────────────────────
// formatDocumentMarkdown — for the white IEEE document panel
// ─────────────────────────────────────────────────────────────────────────────
function formatDocumentMarkdown(text: string): string {
  if (!text) return ''

  const lines = text.split('\n')
  let html       = ''
  let inList     = false
  let inPlantUML = false   // FIX: Gemini echoes the PlantUML code we forward it.
                           // Skip every @startuml...@enduml block — the diagram
                           // image is injected separately by PlantUMLDiagramDoc.

  const closeList = () => {
    if (inList) { html += `</ul>`; inList = false }
  }

  // Strip markdown bold/italic since the document is plain-text IEEE style,
  // but still handle the occasional **word** Gemini might sneak in.
  const applyInline = (s: string) =>
    s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
     .replace(/\*(.+?)\*/g,   '<em>$1</em>')

  for (const line of lines) {
    const trimmed = line.trim()

    // ── PlantUML block gate ────────────────────────────────────────────────
    if (trimmed.startsWith('@startuml')) { inPlantUML = true;  continue }
    if (trimmed === '@enduml')           { inPlantUML = false; continue }
    if (inPlantUML) continue            // skip all code inside the block
    // ──────────────────────────────────────────────────────────────────────

    // Skip markdown code-fence delimiters.
    // Gemini sometimes wraps PlantUML in ```plantuml ... ``` — the @startuml/@enduml
    // content above is already skipped, but the ``` delimiters themselves fall through
    // to the normal text branch and render as stray paragraph tags.
    if (trimmed.startsWith('```')) continue

    if (trimmed === '') {
      closeList()
      html += `<div style="margin:6px 0;"></div>`
      continue
    }

    // Top-level numbered heading  e.g. "1. Introduction", "9. Conclusion"
    if (/^\d+\.\s+/.test(trimmed) && !/^\d+\.\d+/.test(trimmed)) {
      closeList()
      html += `<h2 style="font-size:17px;font-weight:700;margin:20px 0 8px 0;color:#000;border-bottom:1px solid #ccc;padding-bottom:4px;">${applyInline(trimmed)}</h2>`
      continue
    }

    // Sub-section heading  e.g. "5.1 Functional Requirements", "6.1 Use Case Diagram"
    if (/^\d+\.\d+\.?\s+/.test(trimmed)) {
      closeList()
      html += `<h3 style="font-size:15px;font-weight:600;margin:14px 0 6px 0;color:#111;">${applyInline(trimmed)}</h3>`
      continue
    }

    // FR / NFR requirement lines  e.g. "FR1. The system shall..."
    if (/^(FR|NFR)\d+(\.\d+)?[.:]\s*/.test(trimmed)) {
      closeList()
      const parts = trimmed.match(/^((FR|NFR)\d+(\.\d+)?)[.:]\s*(.*)$/)
      if (parts) {
        html += `<p style="font-size:14px;line-height:1.7;margin:5px 0 5px 16px;color:#000;">
                   <strong style="color:#000;">${parts[1]}.</strong> ${applyInline(parts[4])}
                 </p>`
      } else {
        html += `<p style="font-size:14px;line-height:1.7;margin:5px 0 5px 16px;color:#000;"><strong>${applyInline(trimmed)}</strong></p>`
      }
      continue
    }

    // Bullet points
    if (/^[•*\-]\s+/.test(trimmed)) {
      if (!inList) {
        html += `<ul style="margin:6px 0 6px 28px;padding-left:4px;list-style-type:disc;color:#000;">`
        inList = true
      }
      const bulletText = applyInline(trimmed.replace(/^[•*\-]\s+/, ''))
      html += `<li style="font-size:14px;line-height:1.7;margin:3px 0;color:#000;">${bulletText}</li>`
      continue
    }

    closeList()
    html += `<p style="font-size:14px;line-height:1.7;margin:5px 0;color:#000;">${applyInline(trimmed)}</p>`
  }

  closeList()
  return html
}