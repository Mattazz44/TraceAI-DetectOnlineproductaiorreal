import { ChevronRight, Clock } from 'lucide-react'
import ScanThumb from './ScanThumb.jsx'
import ScoreBadge from './ScoreBadge.jsx'

const timeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export default function RecentScans({ scans, limit = 5, onSelect, onSeeAll }) {
  const visible = scans.slice(0, limit)

  return (
    <section aria-labelledby="recent-heading" className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 id="recent-heading" className="text-base font-bold text-ink">
            Riwayat Terbaru
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Tersimpan lokal di peramban perangkat ini
          </p>
        </div>

        {scans.length > 0 && (
          <button
            type="button"
            onClick={onSeeAll}
            className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-line bg-subtle px-3 text-xs font-semibold text-ink transition hover:border-edge"
          >
            <span>Lihat Semua ({scans.length})</span>
            <ChevronRight className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-line bg-subtle/50 px-4 py-8 text-center">
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-xl border border-line bg-card text-muted"
          >
            <Clock className="size-4.5" strokeWidth={1.75} />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">Belum ada pemeriksaan tersimpan</p>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">
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
              <li key={scan.id}>
                <button
                  type="button"
                  onClick={() => onSelect(scan)}
                  className="group flex min-h-16 w-full items-center gap-3 rounded-xl border border-line bg-subtle/40 p-2.5 text-left transition hover:border-edge hover:bg-subtle active:scale-[0.99]"
                  aria-label={`Buka laporan ${scan.name}, skor AI ${scan.probability} persen`}
                >
                  <ScanThumb scan={scan} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink" title={scan.name}>
                      {scan.name}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted">{metaLine}</p>
                  </div>
                  <ScoreBadge
                    probability={scan.probability}
                    isAiGenerated={scan.isAiGenerated}
                    threshold={scan.threshold ?? 65}
                    showLabel={false}
                  />
                  <ChevronRight
                    className="size-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
