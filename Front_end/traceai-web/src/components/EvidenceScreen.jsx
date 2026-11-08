import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronLeft, Home, Lightbulb, Package, Share2 } from 'lucide-react'
import Toast from './Toast.jsx'
import { STATUS, buildEvidence } from '../lib/evidence.js'
import { getVerdict } from '../lib/verdict.js'
import { shareOrCopy } from '../lib/share.js'

/**
 * "Bukti temuan" — forensic breakdown of a finished scan.
 * Responsive across mobile, tablet (iPad), and laptop/desktop.
 */
export default function EvidenceScreen({ scan, onBack, onHome }) {
  const { findings, regions } = buildEvidence(scan.result)
  const [activeId, setActiveId] = useState(null) // id of expanded finding
  const [toast, setToast] = useState(null)
  const [isSharing, setIsSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const headingRef = useRef(null)
  const cardRefs = useRef({})

  useEffect(() => {
    window.scrollTo(0, 0)
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  const toggleFinding = (id) => setActiveId((cur) => (cur === id ? null : id))

  const focusFinding = (id) => {
    if (!id) return
    setActiveId(id)
    cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const dismissToast = useCallback(() => setToast(null), [])

  const handleShare = async () => {
    if (isSharing) return // a second share() while the sheet is open throws InvalidStateError
    setIsSharing(true)

    const { probability } = scan.result
    const lines = findings.map((f) => `• ${f.title}: ${STATUS[f.status].label}`)
    const text = [
      `Hasil cek TraceAI untuk "${scan.name}": ${probability}% kemungkinan buatan AI.`,
      getVerdict(probability).text,
      lines.length ? `\nBukti temuan:\n${lines.join('\n')}` : '',
      '\nCek gambar produkmu sendiri di TraceAI:',
    ]
      .filter(Boolean)
      .join('\n')

    try {
      const outcome = await shareOrCopy({
        title: `TraceAI — ${scan.name}`,
        text,
        url: `${window.location.origin}${window.location.pathname}`,
      })

      if (outcome === 'copied') {
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
        setToast({
          id: Date.now(),
          title: 'Tautan & ringkasan disalin!',
          message: 'Tempel langsung ke WhatsApp, Telegram, atau media sosial.',
        })
      } else if (outcome === 'failed') {
        setToast({ id: Date.now(), tone: 'error', title: 'Gagal menyalin tautan', message: 'Coba lagi.' })
      }
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className="min-h-dvh animate-screen-in">
      <main className="mx-auto w-full max-w-md px-5 pb-48 sm:max-w-xl sm:px-6 md:max-w-2xl lg:max-w-5xl lg:px-10 lg:pb-16 xl:max-w-6xl">
        {/* Header */}
        <header className="flex items-center gap-4 py-5">
          <button
            type="button"
            onClick={onBack}
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-line bg-white text-ink shadow-soft transition hover:bg-canvas active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            aria-label="Kembali ke hasil"
          >
            <ChevronLeft className="size-5" strokeWidth={2.5} />
          </button>
          <h1 ref={headingRef} tabIndex={-1} className="text-xl font-bold tracking-tight text-ink outline-none sm:text-2xl">
            Bukti temuan
          </h1>
        </header>

        <div className="lg:mt-2 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8 xl:gap-10">
          {/* Left column on laptop: Annotated image + inline desktop CTAs */}
          <div className="lg:sticky lg:top-6 lg:col-span-6">
            <AnnotatedImage
              url={scan.url}
              name={scan.name}
              regions={regions}
              activeId={activeId}
              findings={findings}
              onSelectRegion={focusFinding}
            />

            {/* Inline stacked CTAs on laptop/desktop */}
            <div className="mt-4 hidden flex-col gap-2.5 lg:flex">
              <ActionButtons
                copied={copied}
                isSharing={isSharing}
                onShare={handleShare}
                onHome={onHome}
              />
            </div>
          </div>

          {/* Right column on laptop: Forensic metrics */}
          <div className="mt-4 lg:col-span-6 lg:mt-0">
            {findings.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line bg-white/50 px-4 py-6 text-center text-sm text-muted">
                Detail bukti tidak tersedia untuk scan ini.
              </p>
            ) : (
              <ul className="space-y-3">
                {findings.map((f, i) => (
                  <li
                    key={f.id}
                    ref={(el) => (cardRefs.current[f.id] = el)}
                    className="scroll-my-24 animate-rise"
                    style={{ animationDelay: `${120 + i * 60}ms` }}
                  >
                    <FindingCard
                      finding={f}
                      expanded={activeId === f.id}
                      hasRegions={regions.some((r) => r.finding === f.id)}
                      onToggle={() => toggleFinding(f.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      {/* Sticky bottom CTAs on mobile & tablet */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-canvas from-80% to-transparent pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex w-full max-w-md flex-col gap-2.5 px-5 sm:max-w-xl sm:px-6 md:max-w-2xl">
          <ActionButtons
            copied={copied}
            isSharing={isSharing}
            onShare={handleShare}
            onHome={onHome}
          />
        </div>
      </div>

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  )
}

function ActionButtons({ copied, isSharing, onShare, onHome }) {
  return (
    <>
      <button
        type="button"
        onClick={onShare}
        aria-busy={isSharing}
        className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-neon px-4 text-base font-bold text-ink shadow-[0_6px_20px_-8px] shadow-neon-strong transition hover:bg-neon-strong active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {copied ? (
          <>
            <Check className="size-4.5" strokeWidth={3} aria-hidden="true" />
            Tersalin!
          </>
        ) : (
          <>
            <Share2 className="size-4.5" strokeWidth={2.5} aria-hidden="true" />
            Bagikan hasil
          </>
        )}
      </button>
      <button
        type="button"
        onClick={onHome}
        className="flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-[1.5px] border-ink bg-white px-4 text-[15px] font-semibold text-ink transition hover:bg-canvas active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <Home className="size-4.5" strokeWidth={2.25} aria-hidden="true" />
        Kembali ke layar utama
      </button>
    </>
  )
}

/* ------------------------------------------------------------------ */

function AnnotatedImage({ url, name, regions, activeId, findings, onSelectRegion }) {
  const titleOf = (id) => findings.find((f) => f.id === id)?.title

  const boxes = regions.map((r, i) => {
    const isActive = activeId && r.finding === activeId
    const isDimmed = activeId && r.finding !== activeId
    const label = titleOf(r.finding)
    return (
      <button
        key={r.id}
        type="button"
        onClick={() => onSelectRegion(r.finding)}
        disabled={!r.finding}
        aria-label={label ? `Area janggal: ${label}` : 'Area janggal'}
        className={[
          'absolute cursor-pointer rounded-lg border-2 border-[#f0601e] transition-all duration-300 animate-rise',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
          isActive
            ? 'bg-amber/55 shadow-[0_0_0_4px_rgb(240_96_30/0.25)]'
            : 'bg-amber/35 hover:bg-amber/50',
          isDimmed ? 'opacity-35' : 'opacity-100',
        ].join(' ')}
        style={{
          left: `${r.x * 100}%`,
          top: `${r.y * 100}%`,
          width: `${r.w * 100}%`,
          height: `${r.h * 100}%`,
          animationDelay: `${200 + i * 120}ms`,
        }}
      >
        {isActive && label && (
          <span className="absolute -top-2.5 left-2 rounded bg-[#f0601e] px-1.5 py-0.5 text-[10px] leading-none font-bold whitespace-nowrap text-white animate-fade-in">
            {label}
          </span>
        )}
      </button>
    )
  })

  return (
    <figure className="relative grid h-56 place-items-center overflow-hidden rounded-3xl bg-thumb sm:h-72 md:h-80 lg:h-[22rem]">
      {url ? (
        // Wrapper shrinks to the rendered image so normalised boxes line up with it.
        <div className="relative inline-block">
          <img
            src={url}
            alt={`Gambar ${name} dengan area janggal ditandai`}
            className="block max-h-56 w-auto max-w-full sm:max-h-72 md:max-h-80 lg:max-h-[22rem]"
          />
          {boxes}
        </div>
      ) : (
        <div className="absolute inset-0">
          {/* Mock product layout when the original image isn't available */}
          <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
            <Package className="size-20 text-ink/[0.07]" strokeWidth={1.25} />
          </div>
          {boxes}
        </div>
      )}

      <figcaption className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-xs font-semibold text-ink shadow-soft">
        {regions.length > 0 ? (
          <>
            <span className="size-2 rounded-[3px] border border-[#f0601e] bg-amber/60" aria-hidden="true" />
            Area janggal
            <span className="text-muted">· {regions.length}</span>
          </>
        ) : (
          'Tidak ada area janggal'
        )}
      </figcaption>
    </figure>
  )
}

function FindingCard({ finding, expanded, hasRegions, onToggle }) {
  const status = STATUS[finding.status]
  const panelId = `finding-${finding.id}`

  return (
    <article
      className={`rounded-2xl border bg-white shadow-soft transition-colors ${expanded ? 'border-ink/25' : 'border-line'}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="w-full cursor-pointer rounded-2xl p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">{finding.title}</h2>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${status.className}`}>
              {status.label}
            </span>
            <ChevronDown
              className={`size-4 text-ink/30 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </div>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{finding.description}</p>
      </button>

      {/* Smooth height animation via grid-rows */}
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="mx-4 mb-4 flex gap-2.5 rounded-xl bg-canvas p-3 text-[13px] leading-relaxed text-ink/80">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-ink/50" aria-hidden="true" />
            <p>
              {finding.tip}
              {hasRegions && <span className="mt-1 block font-medium text-[#c24a12]">Area terkait ditandai pada gambar.</span>}
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}
