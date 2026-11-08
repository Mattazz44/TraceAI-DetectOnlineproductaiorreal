import { Clock } from 'lucide-react'

export default function Header({ onHistoryClick }) {
  return (
    <header className="flex items-center justify-between py-5">
      <a href="/" className="text-lg font-bold tracking-tight text-ink" aria-label="TraceAi beranda">
        TraceAI
      </a>

      <button
        type="button"
        onClick={onHistoryClick}
        className="grid size-11 place-items-center rounded-xl border border-line bg-white text-ink shadow-soft transition hover:bg-canvas active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        aria-label="Lihat riwayat scan"
      >
        <Clock className="size-5" strokeWidth={2.25} />
      </button>
    </header>
  )
}

