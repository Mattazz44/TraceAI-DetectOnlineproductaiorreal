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
          'rounded-2xl border bg-card/95 p-4 shadow-card transition-all duration-300 sm:p-5',
          isDragging
            ? 'border-emerald-brand ring-4 ring-emerald-brand/15'
            : 'border-line hover:shadow-card-hover',
        ].join(' ')}
      >
        <div className="mb-3.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink transition-colors duration-300" title={file.name}>
              {file.name}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted tabular-nums transition-colors duration-300">
              <span className="rounded bg-subtle px-1.5 py-0.5 font-semibold text-ink transition-colors duration-300">
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
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-subtle text-muted transition-all duration-200 hover:border-edge hover:text-ink active:scale-95"
          >
            <X className="size-4.5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div
          className={[
            'forensic-frame flex h-[250px] w-full items-center justify-center overflow-hidden rounded-xl border border-line bg-stage p-3 transition-colors duration-300 sm:h-[320px] sm:p-4',
            isDragging ? 'forensic-frame-active' : '',
          ].join(' ')}
        >
          <img
            src={previewUrl}
            alt={`Pratinjau ${file.name}`}
            width={dimensions?.width || 800}
            height={dimensions?.height || 500}
            fetchPriority="high"
            className="h-full w-full object-contain animate-zoom-reveal"
          />
        </div>

        {isLowRes && (
          <div
            role="status"
            className="mt-3 flex items-start gap-2.5 rounded-xl border border-warn-border bg-warn-bg px-3.5 py-2.5 text-xs leading-relaxed text-warn-fg tabular-nums transition-colors duration-300"
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
            className="inline-flex min-h-12 w-full flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-brand px-5 text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-[1px] hover:bg-emerald-brand-hover active:scale-95 sm:w-auto"
          >
            <ScanSearch className="size-4.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
            <span>Mulai Analisis Forensik</span>
          </button>

          <button
            type="button"
            onClick={onPickGallery}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-edge bg-card px-4 text-sm font-semibold text-ink transition-all duration-200 hover:-translate-y-[1px] hover:bg-subtle active:scale-95 sm:w-auto"
          >
            <RefreshCw className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span>Ganti Gambar</span>
          </button>
        </div>
      </section>
    )
  }

  return (
    <div className="rounded-2xl border border-line bg-card/95 p-4 shadow-card transition-all duration-300 hover:shadow-card-hover sm:p-5">
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
          'group forensic-frame forensic-frame-interactive flex min-h-56 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-7 text-center transition-all duration-300 sm:min-h-68 sm:px-6 sm:py-8',
          isDragging
            ? 'forensic-frame-active scale-[1.008] border-emerald-brand bg-safe-bg/45 ring-4 ring-emerald-brand/15'
            : 'border-edge/55 bg-stage hover:border-emerald-brand/75 hover:bg-subtle/90',
        ].join(' ')}
      >
        <div className="pointer-events-none flex flex-col items-center">
          <span
            aria-hidden="true"
            className={[
              'mb-4 grid size-12 place-items-center rounded-xl border shadow-card transition-all duration-300 ease-out',
              isDragging
                ? '-translate-y-1.5 scale-105 border-emerald-brand bg-safe-bg text-safe-fg'
                : 'border-line bg-card text-ink group-hover:-translate-y-1 group-hover:border-emerald-brand/50 group-hover:text-emerald-brand',
            ].join(' ')}
          >
            <Upload className="size-5" strokeWidth={2} />
          </span>

          <p className="text-base font-bold tracking-[-0.015em] text-ink transition-colors duration-300 sm:text-lg">
            {isDragging ? 'Lepaskan file gambar untuk memuat pratinjau' : 'Tarik & lepaskan foto produk ke sini'}
          </p>

          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted transition-colors duration-300">
            Klik area ini untuk memilih file dari perangkat, atau tempel langsung dari clipboard (Ctrl+V).
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted tabular-nums transition-colors duration-300">
            <span className="rounded-md border border-line bg-card px-2 py-1 font-semibold text-ink transition-colors duration-300">
              JPG
            </span>
            <span className="rounded-md border border-line bg-card px-2 py-1 font-semibold text-ink transition-colors duration-300">
              PNG
            </span>
            <span className="rounded-md border border-line bg-card px-2 py-1 font-semibold text-ink transition-colors duration-300">
              WEBP
            </span>
            <span className="font-medium text-muted">· Maks. {MAX_FILE_SIZE_MB} MB</span>
          </div>
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={onPickGallery}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-action px-4 text-sm font-semibold text-action-fg transition-all duration-200 hover:-translate-y-[1px] hover:bg-action-hover active:scale-95"
        >
          <Upload className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>Pilih File dari Galeri</span>
        </button>

        <button
          type="button"
          onClick={onTakePhoto}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-edge bg-card px-4 text-sm font-semibold text-ink transition-all duration-200 hover:-translate-y-[1px] hover:bg-subtle active:scale-95"
        >
          <Camera className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>Ambil Foto Kamera</span>
        </button>
      </div>
    </div>
  )
}
