import { Clock, Moon, ScanSearch, Sun } from 'lucide-react'

export default function Header({
  activeScreen = 'landing',
  scansCount = 0,
  theme = 'light',
  onToggleTheme,
  onNavigateHome,
  onNavigateHistory,
}) {
  const isInspectionActive =
    activeScreen === 'landing' || activeScreen === 'analysis' || activeScreen === 'evidence'
  const isHistoryActive = activeScreen === 'history'

  const handleBrandClick = (e) => {
    if (onNavigateHome) {
      e.preventDefault()
      onNavigateHome()
    }
  }

  return (
    <header className="border-b border-line bg-card/85 backdrop-blur-xs">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
        <a
          href="#pemeriksaan"
          onClick={handleBrandClick}
          className="inline-flex min-h-11 items-center gap-2.5 rounded-lg px-1.5 text-ink transition hover:opacity-85"
          aria-label="TraceAI, kembali ke halaman pemeriksaan"
        >
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-edge/50 bg-subtle font-mono text-xs font-semibold text-ink"
          >
            T
          </span>
          <span className="flex flex-col">
            <span className="text-base leading-none font-extrabold tracking-tight text-ink sm:text-[17px]">
              TraceAI
            </span>
            <span className="mt-0.5 hidden text-[11px] leading-none text-muted sm:inline">
              Forensik Keaslian Gambar
            </span>
          </span>
        </a>

        <nav aria-label="Navigasi utama" className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onNavigateHome}
            aria-current={isInspectionActive ? 'page' : undefined}
            className={[
              'inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition sm:px-3.5',
              isInspectionActive
                ? 'bg-action text-action-fg'
                : 'border border-transparent text-muted hover:border-line hover:bg-subtle hover:text-ink',
            ].join(' ')}
          >
            <ScanSearch className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span>Pemeriksaan</span>
          </button>

          <button
            type="button"
            onClick={onNavigateHistory}
            aria-current={isHistoryActive ? 'page' : undefined}
            className={[
              'inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition sm:px-3.5',
              isHistoryActive
                ? 'bg-action text-action-fg'
                : 'border border-transparent text-muted hover:border-line hover:bg-subtle hover:text-ink',
            ].join(' ')}
          >
            <Clock className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span>Riwayat</span>
            {scansCount > 0 && (
              <span
                className={[
                  'rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums',
                  isHistoryActive ? 'bg-action-fg/20 text-action-fg' : 'bg-subtle text-ink',
                ].join(' ')}
              >
                {scansCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Beralih ke tema terang' : 'Beralih ke tema gelap'}
            title={theme === 'dark' ? 'Tema terang' : 'Tema gelap'}
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-card text-ink transition hover:border-edge hover:bg-subtle active:scale-95"
          >
            {theme === 'dark' ? (
              <Sun className="size-4.5" strokeWidth={2} aria-hidden="true" />
            ) : (
              <Moon className="size-4.5" strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        </nav>
      </div>
    </header>
  )
}
