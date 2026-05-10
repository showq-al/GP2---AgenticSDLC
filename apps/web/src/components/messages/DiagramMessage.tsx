'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

const plantumlEncoder = require('plantuml-encoder')

// Dark background version — used in chat bubbles
export function PlantUMLDiagram({ code, title }: { code: string; title: string }) {
  const [retryCount, setRetryCount]       = useState(0)
  const [imgError, setImgError]           = useState(false)
  const [cacheBust, setCacheBust]         = useState('')
  const [downloading, setDownloading]     = useState(false)
  const [copied, setCopied]               = useState(false)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
    })
  }, [code])

  useEffect(() => () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    if (copyTimerRef.current)  clearTimeout(copyTimerRef.current)
  }, [])

  // Auto-retry once after 3 s on first failure
  const handleError = () => {
    if (retryCount < 1) {
      retryTimerRef.current = setTimeout(() => {
        setCacheBust(`?t=${Date.now()}`)
        setRetryCount(r => r + 1)
      }, 3000)
    } else {
      setImgError(true)
    }
  }


  if (!code || code.trim() === '') return null

  const handleDownload = async (url: string) => {
    setDownloading(true)
    try {
      const resp = await fetch(url, { mode: 'cors' })
      const blob = await resp.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `${title.replace(/\s+/g, '_')}.png`
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      // fallback: open in new tab
      window.open(url, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  if (imgError) {
    return (
      <div className="mb-4">
        <p className="text-sm font-semibold text-purple-400 mb-2">{title}</p>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">Failed to load diagram</p>
            <button
              onClick={() => { setImgError(false); setRetryCount(0); setCacheBust(`?t=${Date.now()}`) }}
              className="text-xs text-purple-400 hover:text-purple-300 underline"
            >
              Retry
            </button>
          </div>
          <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">{code}</pre>
        </div>
      </div>
    )
  }

  try {
    const encoded = plantumlEncoder.encode(code)
    const url = `https://www.plantuml.com/plantuml/png/${encoded}${cacheBust}`
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-purple-400">{title}</p>
          <div className="flex items-center gap-3">
            {/* Copy PlantUML code */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition"
              title="Copy PlantUML code"
            >
              {copied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-4 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
            {/* Download PNG */}
            <button
              onClick={() => handleDownload(url)}
              disabled={downloading}
              className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition disabled:opacity-50"
              title="Download diagram"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
              </svg>
              {downloading ? 'Downloading...' : 'Download'}
            </button>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 overflow-x-auto">
          <img src={url} alt={title} className="max-w-full h-auto mx-auto" onError={handleError} />
        </div>
      </div>
    )
  } catch (e) {
    return (
      <div className="mb-4">
        <p className="text-sm font-semibold text-purple-400 mb-2">{title}</p>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">{code}</pre>
        </div>
      </div>
    )
  }
}

// White background version — used inside the document export panel
export function PlantUMLDiagramDoc({ code, title }: { code: string; title: string }) {
  const [imgError, setImgError] = useState(false)
  if (!code) return null
  try {
    const encoded = plantumlEncoder.encode(code)
    const url = `https://www.plantuml.com/plantuml/svg/${encoded}`
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
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                maxWidth: '100%',
                maxHeight: '900px',
                objectFit: 'contain',
              }}
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
