'use client'

interface ChatInputProps {
  feedback: string
  feedbackEnabled: boolean
  isChatLocked: boolean
  isGenerating: boolean
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onStop: () => void
}

export function ChatInput({ feedback, feedbackEnabled, isChatLocked, isGenerating, onChange, onSubmit, onStop }: ChatInputProps) {
  return (
    <div className="bg-gradient-to-t from-black via-black/95 to-transparent pt-4 pb-6 px-6">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={onSubmit} className="mb-4">
          {/* Wrapper — stop button sits outside the opacity-dimmed container */}
          <div className="relative flex items-center">
            <div className={`flex-1 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-3xl overflow-hidden shadow-lg ${(!feedbackEnabled || isChatLocked) ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <div className="flex items-center pr-14">
                <input
                  type="text"
                  value={feedback}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={
                    isChatLocked ? 'This chat is complete. Start a new chat from the sidebar.'
                    : feedbackEnabled ? 'Provide your feedback...'
                    : 'Message AgenticSDLC...'
                  }
                  disabled={!feedbackEnabled || isChatLocked}
                  className="flex-1 px-6 py-4 bg-transparent text-white placeholder-gray-500 focus:outline-none disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Button sits outside the dimmed div — always full opacity */}
            <div className="absolute right-3">
              {isGenerating && !isChatLocked ? (
                <button
                  type="button"
                  onClick={onStop}
                  title="Stop generating"
                  className="active:scale-95 transition-all"
                  style={{
                    width: 36, height: 36,
                    borderRadius: '50%',
                    background: '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="#0d0d0d">
                    <rect x="0" y="0" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!feedback.trim() || !feedbackEnabled || isChatLocked}
                  className="p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full transition"
                >
                  <svg width="20" height="20" fill="white" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </form>
        <p className="text-center text-xs text-gray-500">
          AgenticSDLC may produce inaccurate results. Treat all responses as drafts requiring verification.
        </p>
      </div>
    </div>
  )
}
