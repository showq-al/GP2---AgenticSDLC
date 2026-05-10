'use client'
import { useState, useRef, useEffect } from 'react'

interface HelpCenterProps {
  open: boolean
  onClose: () => void
}

const slides = [
  {
    video: '/images/help/demo.mp4',
    tag: 'Welcome',
    title: 'Meet AgenticSDLC',
    description: 'Watch how AgenticSDLC automates your full software development lifecycle using 5 AI agents from requirements to a final IEEE-style document.',
  },
  {
    video: '/images/help/slide-2.mp4',
    tag: 'Step 1',
    title: 'Start a new project',
    description: 'Click New chat in the sidebar, enter your project name and a brief description. The Requirement Analyst agent starts immediately.',
  },
  {
    video: '/images/help/slide-3.mp4',
    tag: 'Step 2',
    title: 'Review and approve requirements',
    description: 'Read the generated requirements, give feedback to refine them, or approve to continue. The pipeline only starts after your approval.',
  },
  {
    video: '/images/help/slide-4.mp4',
    tag: 'Step 3',
    title: 'Watch the agents work',
    description: 'Four agents run automatically Design Architect, Developer, Software Tester, and Document Agent each building on the previous output.',
  },
  {
    video: '/images/help/slide-5.mp4',
    tag: 'Step 4',
    title: 'Export your SDLC document',
    description: 'Once complete, your full SDLC document appears at the bottom of the chat. Click Export PDF to download a formatted A4 document.',
  },
  {
    video: '/images/help/slide-6.mp4',
    tag: '⚠ Important',
    title: 'Know before you start',
    description: 'Each chat is saved only after all 5 agents complete. Clicking Stop permanently locks the session you cannot resume it. Start a new chat to try again.',
    isWarning: true,
  },
]

export default function HelpCenter({ open, onClose }: HelpCenterProps) {
  const [current, setCurrent] = useState(0)
  const [videoEnded, setVideoEnded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Autoplay video on every slide change
  useEffect(() => {
    if (!open) return
    setVideoEnded(false)
    const v = videoRef.current
    if (v) {
      v.currentTime = 0
      v.play().catch(() => {})
    }
  }, [open, current])

  const prev = () => setCurrent(i => Math.max(0, i - 1))
  const next = () => {
    if (current === slides.length - 1) { onClose(); setCurrent(0) }
    else setCurrent(i => i + 1)
  }
  const handleClose = () => { onClose(); setCurrent(0) }

  if (!open) return null

  const slide = slides[current] as any
  const isLast = current === slides.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={handleClose} />

      <div className="relative z-10 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(160deg, #1a0035 0%, #0d0018 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${slide.isWarning ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' : 'bg-purple-500/15 text-purple-400 border border-purple-500/25'}`}>
              {slide.tag}
            </span>
            <span className="text-xs text-white/20">{current + 1} of {slides.length}</span>
          </div>
          <button onClick={handleClose} className="text-white/30 hover:text-white/70 transition p-1.5 rounded-lg hover:bg-white/10">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Media area */}
        {current === 0 || current === 4 ? (
          <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
            <video
              ref={videoRef}
              src={slide.video}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              onEnded={() => setVideoEnded(true)}
            />
          </div>
        ) : (
          <div className="bg-black w-full">
            <video
              ref={videoRef}
              src={slide.video}
              className="w-full"
              style={{ display: 'block', maxHeight: '360px', objectFit: 'contain' }}
              playsInline
              onEnded={() => setVideoEnded(true)}
            />
          </div>
        )}

        {/* Text */}
        <div className="px-6 pt-5 pb-2">
          <h2 className="text-xl font-semibold text-white mb-2">{slide.title}</h2>
          <p className="text-sm text-white/50 leading-relaxed">{slide.description}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-5">
          {/* Dots */}
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-300 ${i === current ? 'w-6 h-2 bg-purple-500' : 'w-2 h-2 bg-white/15 hover:bg-white/35'}`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {current > 0 && (
              <button onClick={prev} className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/8 transition">
                Back
              </button>
            )}
            <button
              onClick={next}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition bg-purple-600 hover:bg-purple-700 text-white ${videoEnded ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-transparent shadow-[0_0_16px_4px_rgba(168,85,247,0.6)] animate-pulse' : ''}`}
            >
              {isLast ? 'Get Started' : 'Next'}
              {!isLast && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
