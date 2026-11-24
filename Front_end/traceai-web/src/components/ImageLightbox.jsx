import { useEffect, useRef, useState } from 'react'
import { Eye, Flame, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react'

const ZOOM_STEPS = [1, 1.5, 2, 3]

export default function ImageLightbox({
  open,
  onClose,
  url,
  name,
  dimensions,
  heatmap = null,
  regions = [],
  showHeatmap = false,
  showBoxes = false,
  onToggleHeatmap,
  onToggleBoxes,
}) {
  const [zoomIndex, setZoomIndex] = useState(0)
  const closeButtonRef = useRef(null)
  const previousFocusRef = useRef(null)

  const zoom = ZOOM_STEPS[zoomIndex] ?? 1
  const canZoomOut = zoomIndex > 0
  const canZoomIn = zoomIndex < ZOOM_STEPS.length - 1

  useEffect(() => {
    if (!open) return

    previousFocusRef.current = document.activeElement
    setZoomIndex(0)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))
      } else if (e.key === '-') {
        e.preventDefault()
        setZoomIndex((i) => Math.max(0, i - 1))
      } else if (e.key === '0') {
        e.preventDefault()
        setZoomIndex(0)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus()
      }
    }
  }, [open, onClose])

  if (!open || !url) return null

  const dimsLabel =
    dimensions?.width && dimensions?.height
      ? `${dimensions.width} x ${dimensions.height} px`
      : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-title"
      className="fixed inset-0 z-50 flex flex-col bg-[#0e1210]/94 text-[#f1f4f2] backdrop-blur-xs animate-fade-in"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a352f] bg-[#161c19]/95 px-4 py-2.5 sm:px-6">
        <div className="min-w-0 flex-1">
          <h2 id="lightbox-title" className="truncate text-sm font-bold text-[#f1f4f2] sm:text-base">
            {name}
          </h2>
          <p className="text-xs text-[#9ba8a1]">
            {dimsLabel && (
              <>
                <span className="font-mono text-[#f1f4f2]">{dimsLabel}</span>
                {' · '}
              </>
            )}
            Tekan Esc untuk menutup atau tombol zoom untuk memeriksa detail tekstur
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {regions.length > 0 && onToggleBoxes && (
            <button
              type="button"
              onClick={onToggleBoxes}
              aria-pressed={showBoxes}
              className={[
                'inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition',
                showBoxes
                  ? 'border-[#34d399] bg-[#0d2e20] text-[#6ee7b7]'
                  : 'border-[#2a352f] bg-[#1e2622] text-[#f1f4f2] hover:border-[#6d7d74]',
              ].join(' ')}
            >
              <Eye className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span className="hidden sm:inline">Kotak Area</span>
            </button>
          )}

          {heatmap && onToggleHeatmap && (
            <button
              type="button"
              onClick={onToggleHeatmap}
              aria-pressed={showHeatmap}
              className={[
                'inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition',
                showHeatmap
                  ? 'border-[#34d399] bg-[#0d2e20] text-[#6ee7b7]'
                  : 'border-[#2a352f] bg-[#1e2622] text-[#f1f4f2] hover:border-[#6d7d74]',
              ].join(' ')}
            >
              <Flame className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span className="hidden sm:inline">Peta Panas</span>
            </button>
          )}

          <div
            role="group"
            aria-label="Kontrol perbesaran gambar"
            className="inline-flex items-center rounded-xl border border-[#2a352f] bg-[#1e2622] p-0.5"
          >
            <button
              type="button"
              onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
              disabled={!canZoomOut}
              aria-label="Perkecil gambar"
              className="grid size-11 place-items-center rounded-lg text-[#f1f4f2] transition hover:bg-[#25302a] disabled:opacity-40"
            >
              <ZoomOut className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>

            <span className="min-w-13 px-1 text-center font-mono text-xs font-semibold text-[#f1f4f2]">
              {Math.round(zoom * 100)}%
            </span>

            <button
              type="button"
              onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
              disabled={!canZoomIn}
              aria-label="Perbesar gambar"
              className="grid size-11 place-items-center rounded-lg text-[#f1f4f2] transition hover:bg-[#25302a] disabled:opacity-40"
            >
              <ZoomIn className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setZoomIndex(0)}
              disabled={zoomIndex === 0}
              aria-label="Atur ulang perbesaran ke 100 persen"
              className="grid size-11 place-items-center rounded-lg text-[#f1f4f2] transition hover:bg-[#25302a] disabled:opacity-40"
            >
              <RotateCcw className="size-3.5" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup tampilan perbesaran"
            className="grid size-11 place-items-center rounded-xl border border-[#2a352f] bg-[#1e2622] text-[#f1f4f2] transition hover:border-[#6d7d74] hover:bg-[#25302a]"
          >
            <X className="size-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto p-4 sm:p-8"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div
          className="flex min-h-full min-w-full items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <div
            className="relative inline-flex origin-center items-center justify-center transition-transform duration-300 ease-out animate-zoom-reveal"
            style={{
              transform: `scale(${zoom})`,
            }}
          >
            <img
              src={url}
              alt={`Tampilan penuh ${name}`}
              width={dimensions?.width || 1200}
              height={dimensions?.height || 800}
              className="block max-h-[calc(100dvh-10rem)] max-w-[calc(100vw-3rem)] h-auto w-auto rounded-lg object-contain shadow-2xl"
            />

            {heatmap && showHeatmap && (
              <img
                src={heatmap}
                alt=""
                width={dimensions?.width || 1200}
                height={dimensions?.height || 800}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 size-full rounded-lg object-fill opacity-80"
              />
            )}

            {showBoxes &&
              regions.map((r) => (
                <div
                  key={r.id}
                  aria-hidden="true"
                  className="pointer-events-none absolute rounded-lg border-2 border-[#f87171] bg-[#f87171]/15"
                  style={{
                    left: `${r.x * 100}%`,
                    top: `${r.y * 100}%`,
                    width: `${r.w * 100}%`,
                    height: `${r.h * 100}%`,
                  }}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
