import { Message } from '@/types/chat'

interface UseChatOptions {
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  setIsGenerating: (v: boolean) => void
  setShowApproval: (v: boolean) => void
  setIsChatLocked: (v: boolean) => void
  setIsProjectCompleted: (v: boolean) => void
  abortControllerRef: React.MutableRefObject<AbortController | null>
}

export function useChat({
  setMessages,
  setIsGenerating,
  setShowApproval,
  setIsChatLocked,
  setIsProjectCompleted,
  abortControllerRef,
}: UseChatOptions) {

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
      const content = data.content || 'Failed to generate requirements.'
      setMessages(prev =>
        prev.map(msg =>
          msg.status === 'thinking' && msg.agent === 'Requirement Analyst'
            ? { ...msg, content, status: 'awaiting_approval' }
            : msg
        )
      )
      setShowApproval(true)
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessages(prev => prev.filter(msg => msg.status !== 'thinking'))
        setIsGenerating(false)
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

  /**
   * Runs the full LangGraph pipeline (design → developer → tester → document)
   * via a single SSE streaming connection. Updates messages in real-time as
   * each LangGraph node completes.
   */
  const streamPipeline = async (
    name: string,
    description: string,
    requirements: string,
    projId: string
  ) => {
    setIsGenerating(true)
    abortControllerRef.current = new AbortController()

    // Show the first agent (Design Architect) as thinking immediately
    setMessages(prev => [...prev, {
      role: 'agent', agent: 'Design Architect',
      content: 'Extracting Design', timestamp: new Date(), status: 'thinking'
    }])

    try {
      const response = await fetch('http://localhost:8000/agents/stream-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: name,
          project_description: description,
          requirements,
          project_id: projId,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(err?.detail || `Stream failed with status ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))

          if (data.node === 'design') {
            // Complete Design Architect, add Developer thinking
            setMessages(prev => prev.map(msg =>
              msg.status === 'thinking' && msg.agent === 'Design Architect'
                ? { ...msg, content: data.content, status: 'complete', structured_data: data.structured_data }
                : msg
            ))
            setMessages(prev => [...prev, {
              role: 'agent', agent: 'Developer',
              content: 'Recommending Technology Stack', timestamp: new Date(), status: 'thinking'
            }])

          } else if (data.node === 'developer') {
            // Complete Developer, add Software Tester thinking
            setMessages(prev => prev.map(msg =>
              msg.status === 'thinking' && msg.agent === 'Developer'
                ? { ...msg, content: data.content, status: 'complete', structured_data: data.structured_data }
                : msg
            ))
            setMessages(prev => [...prev, {
              role: 'agent', agent: 'Software Tester',
              content: 'Generating Test Strategy', timestamp: new Date(), status: 'thinking'
            }])

          } else if (data.node === 'tester') {
            // Complete Software Tester, add Document Agent thinking
            setMessages(prev => prev.map(msg =>
              msg.status === 'thinking' && msg.agent === 'Software Tester'
                ? { ...msg, content: data.content, status: 'complete', structured_data: data.structured_data }
                : msg
            ))
            setMessages(prev => [...prev, {
              role: 'agent', agent: 'Document Agent',
              content: 'Generating Final SDLC Document', timestamp: new Date(), status: 'thinking'
            }])

          } else if (data.node === 'document') {
            // Complete Document Agent
            setMessages(prev => prev.map(msg =>
              msg.status === 'thinking' && msg.agent === 'Document Agent'
                ? { ...msg, content: data.content, status: 'complete', structured_data: data.structured_data }
                : msg
            ))

          } else if (data.node === 'complete') {
            // Mark project as complete
            if (projId) {
              await fetch(`http://localhost:8000/projects/${projId}/complete`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
              })
              window.dispatchEvent(new Event('completed-chats-updated'))
            }
            setIsChatLocked(true)
            setIsProjectCompleted(true)

          } else if (data.node === 'error') {
            throw new Error(data.message)
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessages(prev => prev.filter(msg => msg.status !== 'thinking'))
      } else {
        console.error('Pipeline streaming error:', error)
        setMessages(prev => prev.map(msg =>
          msg.status === 'thinking'
            ? { ...msg, content: `Failed: ${error.message || 'Unknown error'}`, status: 'complete', failed: true }
            : msg
        ))
      }
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    generateRequirements,
    streamPipeline,
  }
}
