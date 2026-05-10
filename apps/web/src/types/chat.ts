export interface Message {
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