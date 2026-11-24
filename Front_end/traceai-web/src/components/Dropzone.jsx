import { useState } from 'react'
import { AlertTriangle, Camera, RefreshCw, ScanSearch, Upload, X } from 'lucide-react'
import { MAX_FILE_SIZE_MB } from '../lib/detect.js'
import { formatBytes, formatMimeShort } from '../lib/image.js'

export default function Dropzone({
  staged,
  onStageFile,
  onStartScan,
  onClearStaged,
  onPickGallery,
  onTakePhoto,
}) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    if (!isDragging) setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onStageFile(file)
  }

  const handleEmptyZoneKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onPickGallery()
    }
  }

  if (staged) {
    const { file, previewUrl, dimensions } = staged
    const isLowRes =
      dimensions && (dimensions.width < 256 || dimensions.height < 256)

    return (
      <section
        aria-label="Pratinjau gambar siap dianalisis"
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'rounded-2xl border bg-card p-4 shadow-card transition sm:p-5',
          isDragging ? 'border-emerald-brand ring-2 ring-emerald-brand/25' : 'border-line',
        ].join(' ')}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink" title={file.name}>
              {file.name}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted">
              <span className="rounded bg-subtle px-1.5 py-0.5 font-semibold text-ink">
                {formatMimeShort(file.type)}
              </span>
              <span>{formatBytes(file.size)}</span>
              {dimensions && (
                <span>
                  · {dimensions.width} x {dimensions.height} px
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClearStaged}
            aria-label="Batalkan pilihan gambar"
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-subtle text-muted transition hover:border-edge hover:text-ink"
          >
            <X className="size-4.5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="forensic-frame grid aspect-[16/10] w-full place-items-center overflow-hidden rounded-xl border border-line bg-inset">
          <img
            src={previewUrl}
            alt={`Pratinjau ${file.name}`}
            width={dimensions?.width || 800}
            height={dimensions?.height || 500}
            fetchPriority="high"
            className="max-h-full max-w-full object-contain p-3"
          />
        </div>

        {isLowRes && (
          <div
            role="status"
            className="mt-3 flex items-start gap-2.5 rounded-xl border border-warn-border bg-warn-bg px-3.5 py-2.5 text-xs leading-relaxed text-warn-fg"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span>
              Resolusi gambar cukup kecil ({dimensions.width} x {dimensions.height} px). Gunakan foto
              berukuran asli bila tersedia agar pemeriksaan tekstur lebih akurat.
            </span>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={onStartScan}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-brand px-5 text-[15px] font-semibold text-white transition hover:bg-emerald-brand-hover active:scale-[0.99]"
          >
            <ScanSearch className="size-4.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
            <span>Mulai Analisis Forensik</span>
          </button>

          <button
            type="button"
            onClick={onPickGallery}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-edge bg-card px-4 text-sm font-semibold text-ink transition hover:bg-subtle active:scale-[0.99]"
          >
            <RefreshCw className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span>Ganti Gambar</span>
          </button>
        </div>
      </section>
    )
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5">
      <div
        role="button"
        tabIndex={0}
        onClick={onPickGallery}
        onKeyDown={handleEmptyZoneKeyDown}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label="Area unggah gambar. Tarik dan lepaskan file gambar ke sini, atau tekan Enter untuk memilih file dari perangkat."
        className={[
          'forensic-frame flex min-h-60 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition sm:min-h-68',
          isDragging
            ? 'border-emerald-brand bg-safe-bg/50'
            : 'border-edge/60 bg-subtle/60 hover:border-ink hover:bg-subtle',
        ].join(' ')}
      >
        <div className="pointer-events-none flex flex-col items-center">
          <span
            aria-hidden="true"
            className="mb-4 grid size-12 place-items-center rounded-xl border border-line bg-card text-ink shadow-card"
          >
            <Upload className="size-5" strokeWidth={2} />
          </span>

          <p className="text-base font-bold text-ink sm:text-lg">
            {isDragging ? 'Lepaskan file gambar untuk memuat pratinjau' : 'Tarik & lepaskan foto produk ke sini'}
          </p>

          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
            Klik area ini untuk memilih file dari perangkat, atau tempel langsung dari clipboard (Ctrl+V).
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 font-mono text-xs text-muted">
            <span className="rounded-md border border-line bg-card px-2 py-1 text-ink">JPG</span>
            <span className="rounded-md border border-line bg-card px-2 py-1 text-ink">PNG</span>
            <span className="rounded-md border border-line bg-card px-2 py-1 text-ink">WEBP</span>
            <span>· Maks. {MAX_FILE_SIZE_MB} MB</span>
          </div>
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={onPickGallery}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-action px-4 text-sm font-semibold text-action-fg transition hover:bg-action-hover active:scale-[0.99]"
        >
          <Upload className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>Pilih File dari Galeri</span>
        </button>

        <button
          type="button"
          onClick={onTakePhoto}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-edge bg-card px-4 text-sm font-semibold text-ink transition hover:bg-subtle active:scale-[0.99]"
        >
          <Camera className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>Ambil Foto Kamera</span>
        </button>
      </div>
    </div>
  )
}
