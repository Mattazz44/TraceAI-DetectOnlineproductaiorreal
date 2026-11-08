import { useEffect, useRef } from 'react'
import { ChevronLeft, Loader2, ScanSearch } from 'lucide-react'
import { useCountUp } from '../hooks/useCountUp.js'
import { getConfidence, getVerdict } from '../lib/verdict.js'

/**
 * Analysis screen. Responsive across mobile, tablet (iPad), and laptop/desktop.
 *
 * @param {{ name: string, url?: string|null, status: 'scanning'|'done', result?: object }} scan
 */
export default function AnalysisScreen({ scan, onBack, onRescan, onShowEvidence }) {
  const headingRef = useRef(null)
  const isScanning = scan.status === 'scanning'

  // Move focus to the screen title for screen-reader users when the screen opens.
  useEffect(() => {
    window.scrollTo(0, 0)
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div className="min-h-dvh animate-screen-in">
      <main className="mx-auto w-full max-w-md px-5 pb-36 sm:max-w-xl sm:px-6 md:max-w-2xl lg:max-w-5xl lg:px-10 lg:pb-16 xl:max-w-6xl">
        {/* Header bar */}
        <header className="flex items-center gap-4 py-5">
          <button
            type="button"
            onClick={onBack}
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-line bg-white text-ink shadow-soft transition hover:bg-canvas active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            aria-label={isScanning ? 'Batalkan dan kembali' : 'Kembali'}
          >
            <ChevronLeft className="size-5" strokeWidth={2.5} />
          </button>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="min-w-0 truncate text-[15px] font-semibold text-ink outline-none sm:text-lg"
            title={scan.name}
          >
            {scan.name}
          </h1>
        </header>

        <div className="lg:mt-2 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8 xl:gap-10">
          {/* Left column on laptop: Image preview */}
          <div className="lg:col-span-7">
            <PreviewBlock url={scan.url} name={scan.name} isScanning={isScanning} />
          </div>

          {/* Right column on laptop: Verdict + Confidence + Inline Desktop Actions */}
          <div className="mt-4 space-y-3 lg:col-span-5 lg:mt-0 lg:space-y-4">
            {isScanning ? (
              <ScanningCards />
            ) : (
              <>
                <VerdictCard probability={scan.result.probability} />
                <ConfidenceCard
                  probability={scan.result.probability}
                  confidence={scan.result.confidence}
                />
              </>
            )}

            {/* Inline action buttons on laptop/desktop */}
            <div className="hidden pt-2 lg:grid lg:grid-cols-2 lg:gap-3">
              <button
                type="button"
                onClick={onRescan}
                className="h-14 cursor-pointer rounded-2xl border-[1.5px] border-ink bg-white px-4 text-[15px] font-semibold text-ink transition hover:bg-canvas active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {isScanning ? 'Batalkan' : 'Scan lagi'}
              </button>
              <button
                type="button"
                disabled={isScanning}
                onClick={onShowEvidence}
                className="h-14 cursor-pointer rounded-2xl bg-neon px-4 text-[15px] font-bold text-ink shadow-[0_6px_20px_-8px] shadow-neon-strong transition hover:bg-neon-strong active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Lihat bukti
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky bottom actions on mobile & tablet */}
      <nav
        aria-label="Aksi hasil scan"
        className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-canvas from-70% to-transparent pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-2.5 px-5 sm:max-w-xl sm:px-6 md:max-w-2xl">
          <button
            type="button"
            onClick={onRescan}
            className="h-14 cursor-pointer rounded-2xl border-[1.5px] border-ink bg-white px-4 text-[15px] font-semibold text-ink transition hover:bg-canvas active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {isScanning ? 'Batalkan' : 'Scan lagi'}
          </button>
          <button
            type="button"
            disabled={isScanning}
            onClick={onShowEvidence}
            className="h-14 cursor-pointer rounded-2xl bg-neon px-4 text-[15px] font-bold text-ink shadow-[0_6px_20px_-8px] shadow-neon-strong transition hover:bg-neon-strong active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Lihat bukti
          </button>
        </div>
      </nav>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function PreviewBlock({ url, name, isScanning }) {
  return (
    <div className="relative isolate grid h-56 place-items-center overflow-hidden rounded-3xl bg-thumb sm:h-72 md:h-80 lg:h-[26rem]">
      {url ? (
        <img
          src={url}
          alt={`Pratinjau ${name}`}
          className="absolute inset-0 -z-10 size-full object-contain p-2 sm:p-4"
        />
      ) : (
        <span className="text-sm text-muted">[ Pratinjau gambar ]</span>
      )}

      {/* Laser overlay – fades out instead of disappearing abruptly */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${isScanning ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="absolute inset-0 bg-ink/10" />
        {/* subtle grid to sell the "scanning" feel */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(20_22_18/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(20_22_18/0.06)_1px,transparent_1px)] bg-[size:24px_24px]" />
        {isScanning && (
          <div className="absolute inset-x-0 animate-scan">
            {/* glow trail */}
            <div className="absolute inset-x-0 -top-10 h-10 bg-gradient-to-b from-transparent to-neon/35" />
            {/* laser line */}
            <div className="h-[3px] bg-neon shadow-[0_0_12px_3px] shadow-neon" />
          </div>
        )}
      </div>
    </div>
  )
}

function ScanningCards() {
  return (
    <>
      <div
        className="rounded-[1.75rem] bg-ink p-5 text-white sm:p-6"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-[13px] font-medium tracking-wide text-neon uppercase">
          <ScanSearch className="size-4" strokeWidth={2.25} aria-hidden="true" />
          Sedang memindai
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Loader2 className="size-6 animate-spin text-neon" strokeWidth={2.5} aria-hidden="true" />
          <p className="animate-pulse text-lg font-semibold">Menganalisis gambar…</p>
        </div>

        {/* indeterminate bar */}
        <div className="relative mt-5 h-2.5 overflow-hidden rounded-full bg-white/15">
          <div className="absolute inset-y-0 w-1/3 rounded-full bg-neon/80 animate-indeterminate" />
        </div>

        <p className="mt-4 text-sm text-white/60">
          Memeriksa tekstur, pencahayaan, dan metadata.
        </p>
      </div>

      {/* Confidence card skeleton */}
      <div className="rounded-2xl border border-line bg-white p-4 sm:p-5" aria-hidden="true">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 animate-pulse rounded bg-thumb" />
          <div className="h-4 w-14 animate-pulse rounded bg-thumb" />
        </div>
        <div className="mt-3 h-2 animate-pulse rounded-full bg-thumb" />
        <div className="mt-3 h-3 w-full animate-pulse rounded bg-thumb/70" />
        <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-thumb/70" />
      </div>
    </>
  )
}

function VerdictCard({ probability }) {
  const value = useCountUp(probability)
  const verdict = getVerdict(probability)

  return (
    <section
      aria-labelledby="verdict-label"
      className="rounded-[1.75rem] bg-ink p-5 text-white shadow-[0_12px_32px_-12px_rgb(20_22_18/0.5)] animate-rise sm:p-6"
    >
      <h2 id="verdict-label" className="text-[13px] font-medium tracking-wide text-neon uppercase">
        Kemungkinan buatan AI
      </h2>

      <p className="mt-1 flex items-baseline" aria-label={`${probability} persen`}>
        <span className="text-[5.5rem] leading-[0.95] font-extrabold tracking-tighter tabular-nums">
          {value}
        </span>
        <span className="ml-2 text-3xl font-bold">%</span>
      </p>

      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/15"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={probability}
        aria-label="Kemungkinan buatan AI"
      >
        <div className={`h-full rounded-full ${verdict.barClass}`} style={{ width: `${value}%` }} />
      </div>

      <p className="mt-4 text-[17px] leading-snug font-semibold text-balance">{verdict.text}</p>
    </section>
  )
}

function ConfidenceCard({ probability, confidence }) {
  const { strength, level } = getConfidence(probability, confidence)
  const width = useCountUp(strength, 1100)

  return (
    <section
      aria-labelledby="confidence-label"
      className="rounded-2xl border border-line bg-white p-4 shadow-soft animate-rise [animation-delay:90ms] sm:p-5"
    >
      <div className="flex items-center justify-between">
        <h2 id="confidence-label" className="text-[15px] font-semibold text-ink">
          Keyakinan model
        </h2>
        <span className="text-[15px] text-muted">{level}</span>
      </div>

      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-thumb"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={strength}
        aria-valuetext={level}
        aria-labelledby="confidence-label"
      >
        <div className="h-full rounded-full bg-ink" style={{ width: `${width}%` }} />
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        Detektor bisa meleset pada gambar terkompresi atau dari generator baru.
      </p>
    </section>
  )
}
