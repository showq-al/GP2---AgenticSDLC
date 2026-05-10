'use client'
import { useState } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { PlantUMLDiagramDoc } from './DiagramMessage'

// ── Formatting helpers ────────────────────────────────────────────────────────

function formatDocumentMarkdown(text: string): string {
  if (!text) return ''
  const lines = text.split('\n')
  let html = '', inList = false, inPlantUML = false, inCodeBlock = false

  const closeList = () => { if (inList) { html += `</ul>`; inList = false } }
  const applyInline = (s: string) =>
    s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')

  for (const line of lines) {
    const t = line.trim()
    if (t.startsWith('@startuml')) { inPlantUML = true; continue }
    if (t.toLowerCase() === '@enduml') { inPlantUML = false; continue }
    if (inPlantUML) continue
    if (t.startsWith('```')) { inCodeBlock = !inCodeBlock; continue }
    if (inCodeBlock) continue
    if (t === '') { closeList(); html += `<div style="margin:6px 0;"></div>`; continue }

    if (/^(FR|NFR)\d+(\.\d+)?[.:]\s*/.test(t)) {
      closeList()
      const parts = t.match(/^((FR|NFR)\d+(\.\d+)?)[.:]\s*(.*)$/)
      html += parts
        ? `<p style="font-size:14px;line-height:1.7;margin:5px 0 5px 16px;color:#000;"><strong style="color:#000;">${parts[1]}.</strong> ${applyInline(parts[4])}</p>`
        : `<p style="font-size:14px;line-height:1.7;margin:5px 0 5px 16px;color:#000;"><strong>${applyInline(t)}</strong></p>`
      continue
    }
    if (/^\d+\.\s+/.test(t) && !/^\d+\.\d+/.test(t)) {
      closeList()
      html += `<h2 style="font-size:17px;font-weight:700;margin:20px 0 8px 0;color:#000;border-bottom:1px solid #ccc;padding-bottom:4px;">${applyInline(t)}</h2>`
      continue
    }
    if (/^\d+\.\d+\.?\s+/.test(t)) {
      closeList()
      html += `<h3 style="font-size:15px;font-weight:600;margin:14px 0 6px 0;color:#111;">${applyInline(t)}</h3>`
      continue
    }
    if (/^[•*\-]\s+/.test(t)) {
      if (!inList) { html += `<ul style="margin:6px 0 6px 28px;padding-left:4px;list-style-type:disc;color:#000;">`; inList = true }
      html += `<li style="font-size:14px;line-height:1.7;margin:3px 0;color:#000;">${applyInline(t.replace(/^[•*\-]\s+/, ''))}</li>`
      continue
    }
    closeList()
    html += `<p style="font-size:14px;line-height:1.7;margin:5px 0;color:#000;">${applyInline(t)}</p>`
  }
  closeList()
  return html
}

function splitDocumentSections(text: string) {
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

// ── Main component ────────────────────────────────────────────────────────────

interface DocumentMessageProps {
  content: string
  useCaseDiagram: string
  classDiagram: string
}

export function DocumentMessage({ content, useCaseDiagram, classDiagram }: DocumentMessageProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      const source = document.getElementById('final-document-export')
      if (!source) { setIsExporting(false); return }

      // ── Off-screen container ──────────────────────────────────────
      const A4_WIDTH_PX = 794
      const MARGIN_PX   = 60

      const container = document.createElement('div')
      container.style.cssText = `
        position: fixed; left: -9999px; top: 0;
        width: ${A4_WIDTH_PX}px;
        background: #ffffff;
        font-family: Georgia, "Times New Roman", serif;
        padding: ${MARGIN_PX}px;
        box-sizing: border-box;
      `
      const clone = source.cloneNode(true) as HTMLElement
      clone.style.maxHeight  = 'none'
      clone.style.overflow   = 'visible'
      clone.style.height     = 'auto'
      clone.style.width      = '100%'
      clone.style.background = '#ffffff'
      container.appendChild(clone)
      document.body.appendChild(container)

      // ── Convert external images → base64 / SVG → high-res PNG ──────
      const maxImgWidth = A4_WIDTH_PX - MARGIN_PX * 2 - 20
      const allCloneImgs = Array.from(clone.querySelectorAll('img')) as HTMLImageElement[]
      await Promise.all(allCloneImgs.map(async img => {
        if (!img.src || img.src.startsWith('data:') || img.src.startsWith('blob:')) return
        try {
          const resp = await fetch(img.src, { mode: 'cors' })
          const isSvg = img.src.includes('/plantuml/svg/') ||
                        (resp.headers.get('content-type') || '').includes('svg')

          if (isSvg) {
            // Render SVG at 3× pixel density so html2canvas (scale:3) captures
            // it at 1:1 — no upscaling, no quality loss.
            const svgText = await resp.text()
            const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
            const blobUrl = URL.createObjectURL(blob)
            await new Promise<void>(resolve => {
              const tmp = new Image()
              tmp.onload = () => {
                const srcW = tmp.naturalWidth  || 1600
                const srcH = tmp.naturalHeight || 1200
                // Render at 3× the CSS display width → matches html2canvas scale:3
                const renderW = maxImgWidth * 3
                const renderH = Math.round(srcH * (renderW / srcW))
                const c = document.createElement('canvas')
                c.width  = renderW
                c.height = renderH
                const ctx2 = c.getContext('2d')!
                ctx2.fillStyle = '#ffffff'
                ctx2.fillRect(0, 0, renderW, renderH)
                ctx2.drawImage(tmp, 0, 0, renderW, renderH)
                img.src = c.toDataURL('image/png')
                // CSS size = page content width; html2canvas uses CSS size × scale
                img.style.width  = `${maxImgWidth}px`
                img.style.height = `${Math.round(maxImgWidth * renderH / renderW)}px`
                img.removeAttribute('width')
                img.removeAttribute('height')
                URL.revokeObjectURL(blobUrl)
                resolve()
              }
              tmp.onerror = () => { URL.revokeObjectURL(blobUrl); resolve() }
              tmp.src = blobUrl
            })
          } else {
            const blob = await resp.blob()
            await new Promise<void>(resolve => {
              const reader = new FileReader()
              reader.onloadend = () => { img.src = reader.result as string; resolve() }
              reader.onerror = () => resolve()
              reader.readAsDataURL(blob)
            })
          }
        } catch { /* keep original src */ }
      }))

      // Wait for any remaining images
      const images = Array.from(clone.querySelectorAll('img')) as HTMLImageElement[]
      await Promise.all(images.map(img =>
        img.complete ? Promise.resolve() :
        new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r() })
      ))
      await new Promise(r => setTimeout(r, 600))

      // ── Measure diagram + heading positions from clone ────────────
      const containerTop = container.getBoundingClientRect().top
      const cloneDiagramEls = Array.from(clone.querySelectorAll('[data-diagram-container]')) as HTMLElement[]
      const cloneDiagramRanges = cloneDiagramEls.map(el => {
        const r = el.getBoundingClientRect()
        return {
          top:    (r.top    - containerTop) * 3,
          bottom: (r.bottom - containerTop) * 3,
        }
      })
      const headingEls = Array.from(clone.querySelectorAll('h2, h3')) as HTMLElement[]
      const headingCanvasTops = headingEls.map(el => {
        const r = el.getBoundingClientRect()
        return (r.top - containerTop) * 3 // ×3 for html2canvas scale
      })

      // ── Capture full canvas ───────────────────────────────────────
      const fullCanvas = await html2canvas(container, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 15000,
        width: A4_WIDTH_PX,
        windowWidth: A4_WIDTH_PX,
      })
      document.body.removeChild(container)

      const totalH  = fullCanvas.height
      const ctx     = fullCanvas.getContext('2d')!

      // ── Diagram ranges already in canvas px (measured from clone) ──
      const diagramRanges = cloneDiagramRanges

      // ── PDF setup ─────────────────────────────────────────────────
      const pdf        = new jsPDF('p', 'mm', 'a4')
      const pageW_mm   = 210
      const pageH_mm   = 297
      const margin_mm  = 15
      const usableW_mm = pageW_mm  - margin_mm * 2
      const usableH_mm = pageH_mm  - margin_mm * 2
      const scale_mm   = usableW_mm / fullCanvas.width   // mm per canvas px
      const pageHpx    = usableH_mm / scale_mm           // canvas px per page

      // ── White row scanner ─────────────────────────────────────────
      const isRowWhite = (y: number): boolean => {
        if (y < 0 || y >= totalH) return true
        const data = ctx.getImageData(0, Math.floor(y), fullCanvas.width, 1).data
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240) return false
        }
        return true
      }

      // ── Smart page breaks ─────────────────────────────────────────
      const breaks: number[] = []
      let offset = pageHpx

      while (offset < totalH) {
        let breakY = offset
        const prevBreak = breaks.length > 0 ? breaks[breaks.length - 1] : 0

        // Priority 1: if break falls inside a diagram:
        //   • diagram fits on one page from prevBreak → break AFTER diagram
        //   • diagram starts far enough into the page (≥25%) → break BEFORE diagram
        //   • otherwise (huge diagram or starts near page top) → keep natural break
        for (const d of diagramRanges) {
          if (breakY > d.top && breakY < d.bottom) {
            if (d.bottom - prevBreak <= pageHpx * 1.05) {
              breakY = Math.min(d.bottom + 20, totalH)
            } else if (d.top - prevBreak >= pageHpx * 0.25) {
              breakY = d.top - 10
            }
            // else: diagram is huge or starts too close to page top → natural break
            break
          }
        }

        // Priority 2: scan back for 3 consecutive white rows
        if (breakY === offset) {
          for (let y = offset; y >= offset - 80; y--) {
            if (isRowWhite(y) && isRowWhite(y - 1) && isRowWhite(y - 2)) { breakY = y; break }
          }
        }

        // Priority 3: orphan heading guard
        for (const hTop of headingCanvasTops) {
          if (hTop > breakY - pageHpx * 0.20 && hTop < breakY) {
            const candidate = Math.max(0, hTop - 6)
            if (candidate - prevBreak >= pageHpx * 0.30) {
              breakY = candidate
            }
            break
          }
        }

        breaks.push(breakY)
        offset = breakY + pageHpx
      }

      // ── Render pages ──────────────────────────────────────────────
      const pageStarts = [0, ...breaks]
      let first = true

      for (let i = 0; i < pageStarts.length; i++) {
        if (!first) pdf.addPage()

        const startY   = pageStarts[i]
        const endY     = i + 1 < pageStarts.length ? pageStarts[i + 1] : totalH
        const sliceH   = endY - startY
        const sliceHmm = sliceH * scale_mm

        const pageCanvas = document.createElement('canvas')
        pageCanvas.width  = fullCanvas.width
        pageCanvas.height = Math.ceil(sliceH)
        const pCtx = pageCanvas.getContext('2d')!
        pCtx.fillStyle = '#ffffff'
        pCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
        pCtx.drawImage(fullCanvas, 0, -startY)

        pdf.addImage(
          pageCanvas.toDataURL('image/jpeg', 0.95),
          'JPEG', margin_mm, margin_mm, usableW_mm, sliceHmm
        )
        first = false
      }

      pdf.save('SDLC_Document.pdf')

    } catch (err) {
      console.error('PDF export error:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const sections = splitDocumentSections(content)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">Final SDLC document generated using all approved artifacts.</p>
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm transition"
        >
          {isExporting ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>

      <div
        id="final-document-export"
        className="bg-white text-black rounded-lg p-8 max-h-[600px] overflow-y-auto"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif', overflowX: 'hidden' }}
      >
        {sections.map((section, idx) => {
          const fullText = [section.heading, ...section.content].join('\n')

          if (idx === 0 && !section.heading) {
            const titleLine = section.content.find(l => l.trim())
            if (!titleLine?.trim()) return null
            return (
              <div key={idx} style={{ textAlign: 'center', marginBottom: '32px' }}>
                <strong style={{ display: 'block', fontSize: '20px', fontWeight: 700, lineHeight: 1.4, color: '#000', letterSpacing: '0.02em' }}>
                  {titleLine.trim()}
                </strong>
              </div>
            )
          }

          return (
            <div key={idx} style={{ marginBottom: '24px' }}>
              <div dangerouslySetInnerHTML={{ __html: formatDocumentMarkdown(fullText) }} />
              {section.heading.startsWith('6.1') && <PlantUMLDiagramDoc code={useCaseDiagram} title="Use Case Diagram" />}
              {section.heading.startsWith('6.2') && <PlantUMLDiagramDoc code={classDiagram}   title="Class Diagram" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
