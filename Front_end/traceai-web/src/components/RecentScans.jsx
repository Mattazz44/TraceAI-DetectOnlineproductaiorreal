import { ChevronRight } from 'lucide-react'
import ScanThumb from './ScanThumb.jsx'
import ScoreBadge from './ScoreBadge.jsx'

/** Compact preview of the latest scans on the landing page. */
export default function RecentScans({ scans, limit = 5, onSelect, onSeeAll }) {
  const visible = scans.slice(0, limit)

  return (
    <section aria-labelledby="recent-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="recent-heading" className="text-sm font-semibold text-muted lg:text-base lg:text-ink">
          Terakhir di-scan
        </h2>
        {scans.length > 0 && (
          <button
            type="button"
            onClick={onSeeAll}
            className="flex cursor-pointer items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold text-ink/70 transition hover:text-ink focus-visible:outline-2 focus-visible:outline-ink lg:text-sm"
          >
            Lihat semua
            <ChevronRight className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white/50 px-4 py-6 text-center text-sm text-muted">
          Belum ada gambar yang di-scan.
        </p>
      ) : (
        <ul className="space-y-2 md:grid md:grid-cols-2 md:gap-2.5 md:space-y-0 lg:grid-cols-1 lg:space-y-2.5">
          {visible.map((scan, index) => (
            <li
              key={scan.id}
              className={`animate-fade-in ${index >= 3 ? 'hidden md:block' : ''}`}
            >
              <button
                type="button"
                onClick={() => onSelect(scan)}
                className="group flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border border-line bg-white p-2.5 pr-3 text-left shadow-soft transition hover:border-ink/25 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                aria-label={`Buka hasil ${scan.name}, ${scan.probability} persen kemungkinan buatan AI`}
              >
                <ScanThumb scan={scan} />
                <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink" title={scan.name}>
                  {scan.name}
                </p>
                <ScoreBadge probability={scan.probability} />
                <ChevronRight
                  className="-ml-1 size-4 shrink-0 text-ink/25 transition group-hover:translate-x-0.5 group-hover:text-ink/50"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
