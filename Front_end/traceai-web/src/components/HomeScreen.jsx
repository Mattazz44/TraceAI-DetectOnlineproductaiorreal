import { AlertCircle, RotateCcw } from 'lucide-react'
import Dropzone from './Dropzone.jsx'
import RecentScans from './RecentScans.jsx'

export default function HomeScreen({
  staged,
  error,
  scans,
  onStageFile,
  onStartScan,
  onClearStaged,
  onTakePhoto,
  onPickGallery,
  onSelectScan,
  onRemoveScan,
  onClearScans,
  onOpenHistory,
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="max-w-3xl animate-stagger stagger-1">
        <h1 className="text-2xl leading-[1.18] font-extrabold tracking-[-0.03em] text-balance text-ink transition-colors duration-300 sm:text-3xl lg:text-[2.35rem]">
          Periksa keaslian foto produk sebelum membeli atau mempublikasikan
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted transition-colors duration-300 sm:text-base">
          Unggah foto katalog, ulasan, atau iklan untuk mendeteksi jejak generator gambar sintetis,
          meninjau area visual yang janggal, dan membaca metadata perangkat asli.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 md:grid-cols-12 md:gap-7 lg:mt-8 lg:gap-8">
        <div className="space-y-4 md:col-span-7">
          <div className="animate-stagger stagger-2">
            <Dropzone
              staged={staged}
              onStageFile={onStageFile}
              onStartScan={onStartScan}
              onClearStaged={onClearStaged}
              onPickGallery={onPickGallery}
              onTakePhoto={onTakePhoto}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-2xl border border-ai-border bg-ai-bg p-4 text-sm text-ai-fg transition-colors duration-300 sm:flex-row sm:items-center sm:justify-between animate-rise"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 size-4.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                <span className="leading-relaxed font-medium">{error}</span>
              </div>

              {staged && (
                <button
                  type="button"
                  onClick={onStartScan}
                  className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-ai-border bg-card px-3.5 text-xs font-semibold text-ink transition-all duration-200 hover:bg-subtle active:scale-95 sm:w-auto"
                >
                  <RotateCcw className="size-3.5" strokeWidth={2} aria-hidden="true" />
                  <span>Coba Lagi</span>
                </button>
              )}
            </div>
          )}

          <section
            aria-labelledby="accuracy-note-heading"
            className="rounded-2xl border border-line bg-card/90 p-4 shadow-card transition-colors duration-300 animate-stagger stagger-4"
          >
            <h2
              id="accuracy-note-heading"
              className="text-sm font-bold text-ink transition-colors duration-300"
            >
              Panduan akurasi pemeriksaan
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted transition-colors duration-300 sm:text-[13px]">
              Gunakan file gambar beresolusi asli bila tersedia. Tangkapan layar (screenshot) atau gambar
              yang telah dikompresi berulang kali lewat aplikasi pesan dapat mengaburkan detail butiran
              sensor kamera maupun menghapus informasi EXIF.
            </p>
          </section>
        </div>

        <div className="md:col-span-5 animate-stagger stagger-3">
          <RecentScans
            scans={scans}
            limit={5}
            onSelect={onSelectScan}
            onRemove={onRemoveScan}
            onClearAll={onClearScans}
            onSeeAll={onOpenHistory}
          />
        </div>
      </div>
    </div>
  )
}
