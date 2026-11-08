import { AlertCircle } from 'lucide-react'
import Header from './Header.jsx'
import Dropzone from './Dropzone.jsx'
import RecentScans from './RecentScans.jsx'

export default function HomeScreen({
  error,
  scans,
  onFile,
  onTakePhoto,
  onPickGallery,
  onSelectScan,
  onOpenHistory,
}) {
  return (
    <div className="min-h-dvh pb-[max(2.5rem,env(safe-area-inset-bottom))] animate-fade-in">
      <main className="mx-auto w-full max-w-md px-5 sm:max-w-xl sm:px-6 md:max-w-2xl lg:max-w-5xl lg:px-10 xl:max-w-6xl">
        <Header onHistoryClick={onOpenHistory} />

        <div className="mt-3 lg:mt-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-10 xl:gap-12">
          {/* Left column: Hero + Upload + Actions */}
          <div className="lg:col-span-7">
            <h1 className="mb-6 text-[2rem] leading-[1.12] font-extrabold tracking-tight text-balance text-ink sm:text-[2.5rem] lg:text-[2.75rem]">
              Apakah Produk ini buatan AI atau asli?
            </h1>

            <Dropzone onFile={onFile} onBrowse={onPickGallery} />

            {error && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2.5 rounded-2xl border border-alert/30 bg-alert/10 px-4 py-3 text-sm text-ink animate-fade-in"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-alert" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={onTakePhoto}
                className="h-14 cursor-pointer rounded-2xl bg-neon px-4 text-[15px] font-semibold text-ink shadow-[0_6px_20px_-8px] shadow-neon-strong transition hover:bg-neon-strong active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Ambil foto
              </button>
              <button
                type="button"
                onClick={onPickGallery}
                className="h-14 cursor-pointer rounded-2xl border-[1.5px] border-ink bg-white px-4 text-[15px] font-semibold text-ink transition hover:bg-canvas active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Pilih dari galeri
              </button>
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-muted sm:text-sm">
              Tips: pakai gambar ukuran asli. Screenshot dan gambar yang sudah dikompres bisa
              menurunkan akurasi.
            </p>
          </div>

          {/* Right column on laptop/desktop: Recent scans panel */}
          <div className="mt-7 lg:col-span-5 lg:mt-0 lg:rounded-3xl lg:border lg:border-line lg:bg-white/60 lg:p-6 lg:shadow-soft lg:backdrop-blur-sm">
            <RecentScans
              scans={scans}
              limit={5}
              onSelect={onSelectScan}
              onSeeAll={onOpenHistory}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
