import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  History,
  ImageIcon,
  LayoutGrid,
  List,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import ScanThumb from './ScanThumb.jsx'
import ScoreBadge from './ScoreBadge.jsx'

function isFlaggedScan(scan) {
  const threshold = scan.threshold ?? 65
  return typeof scan.isAiGenerated === 'boolean'
    ? scan.isAiGenerated
    : scan.probability >= threshold
}

const FILTERS = [
  { id: 'all', label: 'Semua', test: () => true },
  { id: 'ai', label: 'Terdeteksi AI', test: (s) => isFlaggedScan(s) },
  { id: 'safe', label: 'Gambar Asli', test: (s) => !isFlaggedScan(s) },
]

const timeFmt = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' })
const dateFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const weekdayFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'long' })

function startOfDay(ts) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

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

export default function HistoryScreen({
  scans,
  onBack,
  onNewScan,
  onSelectScan,
  onRemoveScan,
  onClearScans,
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [viewMode, setViewMode] = useState('list')
  const [confirmClear, setConfirmClear] = useState(false)

  const headingRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    headingRef.current?.focus({ preventScroll: true })
  }, [])

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

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const activeFilter = FILTERS.find((f) => f.id === filter) ?? FILTERS[0]
    return groupByDay(
      scans.filter((s) => activeFilter.test(s) && (!q || s.name.toLowerCase().includes(q))),
    )
  }, [scans, query, filter])

  const resultCount = groups.reduce((total, g) => total + g.items.length, 0)

  const handleResetFilters = () => {
    setQuery('')
    setFilter('all')
    searchRef.current?.focus()
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-card/95 text-ink transition hover:border-edge hover:bg-subtle active:scale-95"
            aria-label="Kembali ke halaman pemeriksaan"
          >
            <ChevronLeft className="size-5" strokeWidth={2.25} aria-hidden="true" />
          </button>

          <div>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl leading-tight font-extrabold tracking-[-0.025em] text-ink outline-none sm:text-[1.75rem]"
            >
              Riwayat Pemeriksaan
            </h1>
            <p className="mt-0.5 text-xs text-muted tabular-nums">
              <span className="font-semibold text-ink">{scans.length}</span> laporan tersimpan di
              peramban perangkat ini
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {scans.length > 0 && !confirmClear && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-card/95 px-3.5 text-xs font-semibold text-muted transition hover:border-ai-border hover:bg-ai-bg hover:text-ai-fg sm:flex-none"
            >
              <Trash2 className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span>Hapus Semua</span>
            </button>
          )}

          {confirmClear && (
            <div
              role="group"
              aria-label="Konfirmasi hapus seluruh riwayat"
              className="flex w-full flex-wrap items-center justify-between gap-1.5 rounded-xl border border-ai-border bg-ai-bg p-1.5 sm:w-auto animate-fade-in"
            >
              <span className="px-2 text-xs font-semibold text-ai-fg">Hapus semua?</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onClearScans()
                    setConfirmClear(false)
                  }}
                  className="min-h-11 rounded-lg bg-ai-bar px-3 text-xs font-bold text-white transition hover:opacity-90"
                >
                  Ya, Hapus
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="min-h-11 rounded-lg bg-card px-3 text-xs font-semibold text-ink transition hover:bg-subtle"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onNewScan}
            className="inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-brand px-4 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-[1px] hover:bg-emerald-brand-hover active:scale-95 sm:min-h-11 sm:w-auto"
          >
            <Plus className="size-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />
            <span>Periksa Gambar Baru</span>
          </button>
        </div>
      </div>

      {scans.length > 0 && (
        <div className="mt-6 rounded-2xl border border-line bg-card/95 p-4 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex-1">
              <label
                htmlFor="history-search-input"
                className="mb-1.5 block text-xs font-semibold text-ink"
              >
                Cari nama berkas
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <input
                  id="history-search-input"
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ketik nama produk atau berkas..."
                  className="h-11 w-full rounded-xl border border-line bg-subtle/50 pr-11 pl-10 text-sm text-ink transition outline-none placeholder:text-muted focus:border-edge focus:bg-card [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('')
                      searchRef.current?.focus()
                    }}
                    aria-label="Bersihkan kata kunci pencarian"
                    className="absolute top-1/2 right-0 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-muted transition hover:text-ink"
                  >
                    <X className="size-4" strokeWidth={2} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-start">
              <div
                role="group"
                aria-label="Filter status deteksi"
                className="inline-flex flex-wrap rounded-xl border border-line bg-subtle p-1"
              >
                {FILTERS.map((item) => {
                  const active = filter === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilter(item.id)}
                      className={[
                        'min-h-11 rounded-lg px-2.5 text-xs font-semibold transition sm:px-3',
                        active ? 'bg-card text-ink shadow-card' : 'text-muted hover:text-ink',
                      ].join(' ')}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>

              <div
                role="group"
                aria-label="Tata letak daftar riwayat"
                className="inline-flex rounded-xl border border-line bg-subtle p-1"
              >
                <button
                  type="button"
                  aria-pressed={viewMode === 'list'}
                  aria-label="Tampilan daftar"
                  onClick={() => setViewMode('list')}
                  className={[
                    'grid size-11 place-items-center rounded-lg transition',
                    viewMode === 'list' ? 'bg-card text-ink shadow-card' : 'text-muted hover:text-ink',
                  ].join(' ')}
                >
                  <List className="size-4" strokeWidth={2} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === 'grid'}
                  aria-label="Tampilan grid kartu"
                  onClick={() => setViewMode('grid')}
                  className={[
                    'grid size-11 place-items-center rounded-lg transition',
                    viewMode === 'grid' ? 'bg-card text-ink shadow-card' : 'text-muted hover:text-ink',
                  ].join(' ')}
                >
                  <LayoutGrid className="size-4" strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-6" aria-live="polite">
        {scans.length === 0 ? (
          <EmptyState
            title="Belum ada riwayat pemeriksaan"
            message="Setiap foto produk yang selesai Anda periksa akan tersimpan otomatis di halaman ini beserta skor dan rincian buktinya."
            actionLabel="Mulai Pemeriksaan Pertama"
            onAction={onNewScan}
          />
        ) : resultCount === 0 ? (
          <EmptyState
            title="Tidak ada hasil yang cocok"
            message={
              query
                ? `Tidak ditemukan berkas dengan kata kunci "${query.trim()}" pada filter saat ini.`
                : 'Belum ada pemeriksaan yang masuk ke dalam kategori filter ini.'
            }
            actionLabel="Reset Pencarian & Filter"
            onAction={handleResetFilters}
          />
        ) : (
          groups.map((group) => (
            <section key={group.key} aria-labelledby={`group-${group.key}`}>
              <div className="mb-3 flex items-baseline justify-between border-b border-line pb-1.5">
                <h2 id={`group-${group.key}`} className="text-sm font-bold text-ink">
                  {group.label}
                </h2>
                {group.date && (
                  <span className="text-xs font-medium text-muted tabular-nums">{group.date}</span>
                )}
              </div>

              {viewMode === 'grid' ? (
                <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((scan) => (
                    <li key={scan.id}>
                      <HistoryGridCard
                        scan={scan}
                        onSelect={() => onSelectScan(scan)}
                        onRemove={() => onRemoveScan(scan.id)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2.5">
                  {group.items.map((scan) => (
                    <li key={scan.id}>
                      <HistoryListRow
                        scan={scan}
                        onSelect={() => onSelectScan(scan)}
                        onRemove={() => onRemoveScan(scan.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))
        )}
      </div>
    </div>
  )
}

function HistoryListRow({ scan, onSelect, onRemove }) {
  const time = scan.scannedAt ? timeFmt.format(scan.scannedAt) : 'Waktu tidak tercatat'
  const meta = scan.details?.imageMeta
  const subline =
    meta?.width && meta?.height ? `${time} · ${meta.width}x${meta.height} px` : time

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-line bg-card/95 p-2.5 shadow-card transition hover:border-edge">
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left sm:gap-3.5"
        aria-label={`Buka laporan ${scan.name}, skor AI ${scan.probability} persen`}
      >
        <ScanThumb scan={scan} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink sm:text-[15px]" title={scan.name}>
            {scan.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted tabular-nums">{subline}</p>
        </div>
        <ScoreBadge
          probability={scan.probability}
          isAiGenerated={scan.isAiGenerated}
          threshold={scan.threshold ?? 65}
        />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        aria-label={`Hapus ${scan.name} dari riwayat`}
        title="Hapus item riwayat"
        className="grid size-11 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-ai-bg hover:text-ai-fg"
      >
        <Trash2 className="size-4" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  )
}

function HistoryGridCard({ scan, onSelect, onRemove }) {
  const time = scan.scannedAt ? timeFmt.format(scan.scannedAt) : 'Waktu tidak tercatat'
  const meta = scan.details?.imageMeta
  const subline =
    meta?.width && meta?.height ? `${time} · ${meta.width}x${meta.height} px` : time

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card/95 shadow-card transition hover:border-edge">
      <button
        type="button"
        onClick={onSelect}
        className="group flex flex-1 flex-col text-left"
        aria-label={`Buka laporan ${scan.name}, skor AI ${scan.probability} persen`}
      >
        <div className="flex h-44 w-full items-center justify-center overflow-hidden border-b border-line bg-stage p-2.5">
          {scan.thumbnail ? (
            <img
              src={scan.thumbnail}
              alt=""
              width={400}
              height={250}
              className="h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <ImageIcon className="size-8 text-muted/60" strokeWidth={1.5} aria-hidden="true" />
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between p-4">
          <p className="line-clamp-1 text-sm font-bold text-ink" title={scan.name}>
            {scan.name}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted tabular-nums">{subline}</span>
            <ScoreBadge
              probability={scan.probability}
              isAiGenerated={scan.isAiGenerated}
              threshold={scan.threshold ?? 65}
              showLabel={false}
            />
          </div>
        </div>
      </button>

      <div className="flex justify-end border-t border-line px-3 py-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label={`Hapus ${scan.name} dari riwayat`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-muted transition hover:bg-ai-bg hover:text-ai-fg"
        >
          <Trash2 className="size-3.5" strokeWidth={2} aria-hidden="true" />
          <span>Hapus</span>
        </button>
      </div>
    </article>
  )
}

function EmptyState({ title, message, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-card/95 px-6 py-12 text-center shadow-card">
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-2xl border border-line bg-subtle text-muted"
      >
        <History className="size-5" strokeWidth={1.75} />
      </span>
      <h2 className="mt-4 text-base font-bold text-ink">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-action px-5 text-sm font-semibold text-action-fg transition hover:bg-action-hover sm:min-h-11 sm:w-auto"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
