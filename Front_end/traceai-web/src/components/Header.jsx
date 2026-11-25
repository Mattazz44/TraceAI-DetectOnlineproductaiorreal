import { Clock, Moon, ScanSearch, Sun } from 'lucide-react'
import TraceLogo from './TraceLogo.jsx'

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
  const isDark = theme === 'dark'

  const handleBrandClick = (e) => {
    if (onNavigateHome) {
      e.preventDefault()
      onNavigateHome()
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-card/90 backdrop-blur-xs transition-colors duration-300">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3 lg:px-8">
        <a
          href="#pemeriksaan"
          onClick={handleBrandClick}
          className="group inline-flex min-h-11 min-w-0 shrink-0 items-center gap-2 rounded-xl px-1 text-ink transition-all duration-200 active:scale-95 sm:gap-2.5"
          aria-label="TraceAI, kembali ke halaman pemeriksaan"
        >
          <TraceLogo className="size-8 sm:size-9" />
          <span className="flex flex-col">
            <span className="text-base leading-none font-extrabold tracking-[-0.03em] text-ink transition-colors duration-300 sm:text-lg">
              TraceAI
            </span>
            <span className="mt-1 hidden text-[11px] leading-none font-medium text-muted transition-colors duration-300 sm:inline">
              Forensik Keaslian Gambar
            </span>
          </span>
        </a>

        <nav aria-label="Navigasi utama" className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={onNavigateHome}
            aria-current={isInspectionActive ? 'page' : undefined}
            className={[
              'inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition-all duration-200 active:scale-95 sm:gap-2 sm:px-3.5 sm:text-sm',
              isInspectionActive
                ? 'bg-action text-action-fg shadow-xs'
                : 'border border-transparent text-muted hover:-translate-y-[1px] hover:border-line hover:bg-subtle hover:text-ink',
            ].join(' ')}
          >
            <ScanSearch className="hidden size-4 shrink-0 sm:inline-block" strokeWidth={2} aria-hidden="true" />
            <span>Pemeriksaan</span>
          </button>

          <button
            type="button"
            onClick={onNavigateHistory}
            aria-current={isHistoryActive ? 'page' : undefined}
            className={[
              'inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition-all duration-200 active:scale-95 sm:gap-2 sm:px-3.5 sm:text-sm',
              isHistoryActive
                ? 'bg-action text-action-fg shadow-xs'
                : 'border border-transparent text-muted hover:-translate-y-[1px] hover:border-line hover:bg-subtle hover:text-ink',
            ].join(' ')}
          >
            <Clock className="hidden size-4 shrink-0 sm:inline-block" strokeWidth={2} aria-hidden="true" />
            <span>Riwayat</span>
            {scansCount > 0 && (
              <span
                className={[
                  'rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums transition-colors duration-300 sm:text-xs',
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
            aria-label={isDark ? 'Beralih ke tema terang' : 'Beralih ke tema gelap'}
            title={isDark ? 'Tema terang' : 'Tema gelap'}
            className="group relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-card text-ink transition-all duration-300 hover:border-edge hover:bg-subtle active:scale-95"
          >
            <span className="relative grid size-5 place-items-center" aria-hidden="true">
              <Sun
                className={[
                  'col-start-1 row-start-1 size-4.5 transition-all duration-300 ease-out',
                  isDark
                    ? 'scale-100 rotate-0 opacity-100 group-hover:rotate-12'
                    : 'scale-0 rotate-90 opacity-0',
                ].join(' ')}
                strokeWidth={2}
              />
              <Moon
                className={[
                  'col-start-1 row-start-1 size-4.5 transition-all duration-300 ease-out',
                  isDark
                    ? 'scale-0 -rotate-90 opacity-0'
                    : 'scale-100 rotate-0 opacity-100 group-hover:-rotate-12',
                ].join(' ')}
                strokeWidth={2}
              />
            </span>
          </button>
        </nav>
      </div>
    </header>
  )
}
