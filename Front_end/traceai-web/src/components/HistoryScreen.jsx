import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ChevronLeft, ChevronRight, History, Search, X } from 'lucide-react'
import ScanThumb from './ScanThumb.jsx'
import ScoreBadge from './ScoreBadge.jsx'

const FILTERS = [
  { id: 'all', label: 'Semua', test: () => true },
  { id: 'high', label: 'AI tinggi', test: (s) => s.probability >= 50 },
  { id: 'low', label: 'AI rendah', test: (s) => s.probability < 50 },
]

const timeFmt = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' })
const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
const weekdayFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'long' })

function startOfDay(ts) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Groups scans by calendar day, newest first. Scans without a timestamp go last. */
function groupByDay(scans) {
  const today = startOfDay(Date.now())
  const DAY = 86_400_000
  const groups = new Map()

  const sorted = [...scans].sort((a, b) => (b.scannedAt ?? 0) - (a.scannedAt ?? 0))
  for (const scan of sorted) {
    const day = scan.scannedAt ? startOfDay(scan.scannedAt) : 'unknown'
    if (!groups.has(day)) {
      let label = 'Sebelumnya'
      if (day !== 'unknown') {
        const diff = Math.round((today - day) / DAY)
        label = diff <= 0 ? 'Hari ini' : diff === 1 ? 'Kemarin' : weekdayFmt.format(day)
        label = label.charAt(0).toUpperCase() + label.slice(1)
      }
      groups.set(day, {
        key: String(day),
        label,
        date: day === 'unknown' ? null : dateFmt.format(day).replace('.', ''),
        items: [],
      })
    }
    groups.get(day).items.push(scan)
  }
  return [...groups.values()]
}

/** "Riwayat scan" — searchable, filterable list of all past scans grouped by day. */
export default function HistoryScreen({ scans, onBack, onNewScan, onSelectScan }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const headingRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const test = FILTERS.find((f) => f.id === filter).test
    return groupByDay(scans.filter((s) => test(s) && (!q || s.name.toLowerCase().includes(q))))
  }, [scans, query, filter])

  const resultCount = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="min-h-dvh animate-screen-in">
      <main className="mx-auto w-full max-w-md px-5 pb-32 sm:max-w-xl sm:px-6 md:max-w-3xl lg:max-w-5xl lg:px-10 lg:pb-16 xl:max-w-6xl">
        {/* Header */}
        <header className="flex items-center gap-4 py-5">
          <button
            type="button"
            onClick={onBack}
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-line bg-white text-ink shadow-soft transition hover:bg-canvas active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            aria-label="Kembali ke beranda"
          >
            <ChevronLeft className="size-5" strokeWidth={2.5} />
          </button>
          <div className="min-w-0 flex-1">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-xl font-bold tracking-tight text-ink outline-none sm:text-2xl"
            >
              Riwayat scan
            </h1>
          </div>
          <span className="text-sm font-medium text-muted">{scans.length} scan</span>
          <button
            type="button"
            onClick={onNewScan}
            className="hidden h-11 cursor-pointer items-center gap-2 rounded-xl bg-neon px-4 text-sm font-bold text-ink shadow-[0_6px_20px_-8px] shadow-neon-strong transition hover:bg-neon-strong active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink lg:inline-flex"
          >
            <Camera className="size-4.5" strokeWidth={2.25} aria-hidden="true" />
            Scan produk baru
          </button>
        </header>

        <p className="text-sm text-muted">Telusuri kembali hasil scan produkmu.</p>

        {/* Search + Filter toolbar (side-by-side on tablet/laptop) */}
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-ink/60"
              strokeWidth={2.25}
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama produk atau file"
              aria-label="Cari nama produk atau file"
              className="h-12 w-full rounded-2xl border border-line bg-white pr-11 pl-11 text-[15px] text-ink shadow-soft transition outline-none placeholder:text-muted/80 focus:border-ink/40 focus:ring-4 focus:ring-ink/5 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  searchRef.current?.focus()
                }}
                className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-canvas hover:text-ink"
                aria-label="Hapus pencarian"
              >
                <X className="size-4" strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div
            className="grid grid-cols-3 gap-2 md:w-80 md:shrink-0"
            role="radiogroup"
            aria-label="Filter hasil"
          >
            {FILTERS.map((f) => {
              const active = filter === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setFilter(f.id)}
                  className={[
                    'h-10 cursor-pointer rounded-xl border text-sm font-semibold transition active:scale-[0.97] md:h-12',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                    active
                      ? 'border-neon bg-neon text-ink'
                      : 'border-line bg-white text-ink hover:border-ink/25',
                  ].join(' ')}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        <p className="mt-3 text-[13px] text-muted">Persentase menunjukkan kemungkinan buatan AI.</p>

        {/* List */}
        <div className="mt-4 space-y-6" aria-live="polite">
          {scans.length === 0 ? (
            <EmptyState
              title="Belum ada riwayat"
              message="Hasil scan akan tersimpan di sini."
            />
          ) : resultCount === 0 ? (
            <EmptyState
              title="Tidak ada hasil"
              message={query ? `Tidak ada file yang cocok dengan "${query.trim()}".` : 'Tidak ada scan untuk filter ini.'}
            />
          ) : (
            groups.map((group) => (
              <section key={group.key} aria-label={group.label}>
                <div className="mb-2.5 flex items-baseline justify-between">
                  <h2 className="text-sm font-semibold text-ink/75">{group.label}</h2>
                  {group.date && <span className="text-[13px] text-muted">{group.date}</span>}
                </div>
                <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3">
                  {group.items.map((scan) => (
                    <li key={scan.id} className="animate-fade-in">
                      <HistoryRow scan={scan} onSelect={() => onSelectScan(scan)} />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </main>

      {/* Sticky CTA on mobile & tablet */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-canvas from-70% to-transparent pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto w-full max-w-md px-5 sm:max-w-xl sm:px-6 md:max-w-3xl">
          <button
            type="button"
            onClick={onNewScan}
            className="flex h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-neon px-4 text-base font-bold text-ink shadow-[0_6px_20px_-8px] shadow-neon-strong transition hover:bg-neon-strong active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <Camera className="size-5" strokeWidth={2.25} aria-hidden="true" />
            Scan produk baru
          </button>
        </div>
      </div>
    </div>
  )
}

function HistoryRow({ scan, onSelect }) {
  const level = scan.probability >= 50 ? 'AI tinggi' : 'AI rendah'
  const time = scan.scannedAt ? timeFmt.format(scan.scannedAt) : null

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border border-line bg-white p-2.5 pr-3 text-left shadow-soft transition hover:border-ink/20 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      aria-label={`Buka hasil ${scan.name}, ${scan.probability} persen kemungkinan buatan AI`}
    >
      <ScanThumb scan={scan} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-ink" title={scan.name}>
          {scan.name}
        </p>
        <p className="mt-0.5 text-[13px] text-muted">
          {time ? `${time} · ${level}` : level}
        </p>
      </div>
      <ScoreBadge probability={scan.probability} />
      <ChevronRight
        className="size-4.5 shrink-0 text-ink/40 transition group-hover:translate-x-0.5 group-hover:text-ink/70"
        strokeWidth={2.25}
        aria-hidden="true"
      />
    </button>
  )
}

function EmptyState({ title, message }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-white/50 px-6 py-10 text-center">
      <History className="size-8 text-ink/25" strokeWidth={1.75} aria-hidden="true" />
      <p className="mt-3 text-[15px] font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
    </div>
  )
}
