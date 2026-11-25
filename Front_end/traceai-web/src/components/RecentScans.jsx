import { useEffect, useState } from 'react'
import { ChevronRight, Clock, Trash2 } from 'lucide-react'
import ScanThumb from './ScanThumb.jsx'
import ScoreBadge from './ScoreBadge.jsx'

const timeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export default function RecentScans({
  scans,
  limit = 5,
  onSelect,
  onRemove,
  onClearAll,
  onSeeAll,
}) {
  const [confirmClear, setConfirmClear] = useState(false)
  const visible = scans.slice(0, limit)

  useEffect(() => {
    if (!confirmClear) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setConfirmClear(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmClear])

  useEffect(() => {
    if (scans.length === 0 && confirmClear) {
      setConfirmClear(false)
    }
  }, [scans.length, confirmClear])

  return (
    <section
      aria-labelledby="recent-heading"
      className="rounded-2xl border border-line bg-card/95 p-4 shadow-card transition-all duration-300 hover:shadow-card-hover sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2
            id="recent-heading"
            className="text-base font-bold tracking-[-0.02em] text-ink transition-colors duration-300"
          >
            Riwayat Terbaru
          </h2>
          <p className="mt-0.5 text-xs text-muted transition-colors duration-300">
            Tersimpan lokal di peramban perangkat ini
          </p>
        </div>

        {scans.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {onClearAll && !confirmClear && (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-card px-3 text-xs font-semibold text-muted transition-all duration-200 hover:border-ai-border hover:bg-ai-bg hover:text-ai-fg active:scale-95"
              >
                <Trash2 className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
                <span>Hapus Semua</span>
              </button>
            )}

            <button
              type="button"
              onClick={onSeeAll}
              className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-line bg-subtle px-3 text-xs font-semibold text-ink tabular-nums transition-all duration-200 hover:-translate-y-[1px] hover:border-edge active:scale-95"
            >
              <span>Lihat Semua ({scans.length})</span>
              <ChevronRight className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {confirmClear && scans.length > 0 && (
        <div
          role="group"
          aria-label="Konfirmasi hapus seluruh riwayat terbaru"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ai-border bg-ai-bg p-3 transition-colors duration-300 animate-fade-in"
        >
          <p className="text-xs font-semibold text-ai-fg tabular-nums">
            Hapus seluruh {scans.length} riwayat tersimpan?
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onClearAll?.()
                setConfirmClear(false)
              }}
              className="min-h-11 rounded-lg bg-ai-bar px-3 text-xs font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
            >
              Ya, Hapus
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="min-h-11 rounded-lg bg-card px-3 text-xs font-semibold text-ink transition-all duration-200 hover:bg-subtle active:scale-95"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-line bg-subtle/50 px-4 py-8 text-center transition-colors duration-300">
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-xl border border-line bg-card text-muted transition-colors duration-300"
          >
            <Clock className="size-4.5" strokeWidth={1.75} />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink transition-colors duration-300">
            Belum ada pemeriksaan tersimpan
          </p>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted transition-colors duration-300">
            Unggah foto produk di panel samping untuk melihat skor keaslian, peta panas area janggal, dan rincian EXIF.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {visible.map((scan) => {
            const stamp = scan.scannedAt ? timeFormatter.format(scan.scannedAt) : 'Waktu tidak tercatat'
            const dims = scan.details?.imageMeta
            const metaLine =
              dims?.width && dims?.height
                ? `${stamp} · ${dims.width}x${dims.height} px`
                : stamp

            return (
              <li
                key={scan.id}
                className="flex items-center gap-1.5 rounded-xl border border-line bg-subtle/40 p-1.5 transition-all duration-200 hover:border-edge hover:bg-subtle/80"
              >
                <button
                  type="button"
                  onClick={() => onSelect(scan)}
                  className="group flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left transition-transform duration-150 active:scale-[0.99]"
                  aria-label={`Buka laporan ${scan.name}, skor AI ${scan.probability} persen`}
                >
                  <ScanThumb scan={scan} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink transition-colors duration-300" title={scan.name}>
                      {scan.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted tabular-nums transition-colors duration-300">
                      {metaLine}
                    </p>
                  </div>
                  <ScoreBadge
                    probability={scan.probability}
                    isAiGenerated={scan.isAiGenerated}
                    threshold={scan.threshold ?? 65}
                    showLabel={false}
                  />
                </button>

                {onRemove && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove(scan.id)
                    }}
                    aria-label={`Hapus ${scan.name} dari riwayat`}
                    title="Hapus item riwayat"
                    className="grid size-11 shrink-0 place-items-center rounded-lg text-muted transition-all duration-200 hover:bg-ai-bg hover:text-ai-fg active:scale-95"
                  >
                    <Trash2 className="size-4" strokeWidth={2} aria-hidden="true" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
