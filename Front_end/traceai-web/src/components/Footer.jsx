import { Pause, Play } from 'lucide-react'

export default function Footer({ bgPaused = false, onToggleBgMotion }) {
  return (
    <footer className="mt-auto border-t border-line bg-card/95 font-sans transition-colors duration-300">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-center text-xs leading-relaxed text-muted transition-colors duration-300 sm:px-6 md:flex-row md:gap-4 md:text-left lg:px-8">
        <p className="text-muted transition-colors duration-300 md:text-left">
          TraceAI memeriksa pola tekstur piksel, anomali pencahayaan, dan metadata EXIF pada foto produk.
        </p>

        <div className="flex flex-col items-center gap-2 md:flex-row md:items-center md:gap-3 md:text-right">
          <p className="text-muted transition-colors duration-300 md:text-right">
            Riwayat pemeriksaan disimpan lokal di peramban perangkat ini · Swin Transformer v6
          </p>

          {onToggleBgMotion && (
            <button
              type="button"
              onClick={onToggleBgMotion}
              aria-pressed={bgPaused}
              aria-label={bgPaused ? 'Aktifkan animasi latar' : 'Jeda animasi latar'}
              title={bgPaused ? 'Aktifkan animasi latar' : 'Jeda animasi latar'}
              className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-subtle/70 text-muted transition-all duration-200 hover:border-edge hover:bg-subtle hover:text-ink active:scale-95"
            >
              {bgPaused ? (
                <Play className="size-3.5" strokeWidth={2} aria-hidden="true" />
              ) : (
                <Pause className="size-3.5" strokeWidth={2} aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>
    </footer>
  )
}
