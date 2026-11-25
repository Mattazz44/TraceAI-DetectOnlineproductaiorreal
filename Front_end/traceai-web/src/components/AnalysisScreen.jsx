import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ChevronLeft,
  FileSearch,
  Loader2,
  RotateCcw,
  ShieldCheck,
  ZoomIn,
} from 'lucide-react'
import ImageLightbox from './ImageLightbox.jsx'
import { useCountUp } from '../hooks/useCountUp.js'
import { formatBytes } from '../lib/image.js'
import { getConfidence, getVerdict } from '../lib/verdict.js'

export default function AnalysisScreen({ scan, onBack, onRescan, onShowEvidence }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const headingRef = useRef(null)
  const isScanning = scan.status === 'scanning'

  useEffect(() => {
    window.scrollTo(0, 0)
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  const result = scan.result
  const threshold = result?.threshold ?? 65
  const dimensions = scan.dimensions || result?.details?.imageMeta || null
  const verdict = result
    ? getVerdict(result.probability, result.isAiGenerated, threshold)
    : null

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-card/95 text-ink transition hover:border-edge hover:bg-subtle active:scale-95"
            aria-label={isScanning ? 'Batalkan pemeriksaan dan kembali' : 'Kembali ke halaman sebelumnya'}
          >
            <ChevronLeft className="size-5" strokeWidth={2.25} aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">
              {isScanning ? 'Memeriksa berkas gambar' : 'Ringkasan hasil pemeriksaan'}
            </p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="truncate text-lg leading-snug font-extrabold tracking-[-0.025em] text-ink outline-none sm:text-xl"
              title={scan.name}
            >
              {scan.name}
            </h1>
          </div>
        </div>

        {verdict && <StatusPill verdict={verdict} />}
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 md:grid-cols-12 md:gap-7 lg:gap-8">
        <div className="space-y-4 md:col-span-7">
          <PreviewViewport
            url={scan.url}
            name={scan.name}
            dimensions={dimensions}
            isScanning={isScanning}
            onOpenLightbox={() => setLightboxOpen(true)}
          />

          {!isScanning && result && (
            <TechnicalSummaryCard
              result={result}
              fallbackDimensions={scan.dimensions}
              fallbackSize={scan.fileSize}
              fallbackFormat={scan.fileFormat}
            />
          )}
        </div>

        <div className="space-y-4 md:col-span-5">
          {isScanning ? (
            <ScanningPanel onCancel={onRescan} />
          ) : (
            <>
              <VerdictCard result={result} verdict={verdict} threshold={threshold} />
              <ConfidenceCard result={result} threshold={threshold} />

              {result.modelWarning && (
                <div
                  role="status"
                  className="flex items-start gap-2.5 rounded-2xl border border-warn-border bg-warn-bg p-4 text-xs leading-relaxed text-warn-fg animate-fade-in"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                  <span>{result.modelWarning}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                <button
                  type="button"
                  onClick={onShowEvidence}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-brand px-4 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-[1px] hover:bg-emerald-brand-hover active:scale-95"
                >
                  <FileSearch className="size-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                  <span>Buka Bukti & Metadata</span>
                </button>

                <button
                  type="button"
                  onClick={onRescan}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-edge bg-card/95 px-4 text-sm font-semibold text-ink transition-all duration-200 hover:-translate-y-[1px] hover:bg-subtle active:scale-95"
                >
                  <RotateCcw className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                  <span>Periksa Gambar Baru</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <ImageLightbox
        open={lightboxOpen && !isScanning}
        onClose={() => setLightboxOpen(false)}
        url={scan.url}
        name={scan.name}
        dimensions={dimensions}
      />
    </div>
  )
}

function StatusPill({ verdict }) {
  const Icon = verdict.tone === 'safe' ? ShieldCheck : AlertTriangle
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${verdict.pillClass}`}
    >
      <Icon className="size-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />
      <span>{verdict.badge}</span>
    </span>
  )
}

function PreviewViewport({ url, name, dimensions, isScanning, onOpenLightbox }) {
  return (
    <div className="forensic-frame relative flex h-[280px] w-full items-center justify-center overflow-hidden rounded-2xl border border-line bg-stage p-4 shadow-card sm:h-[360px] sm:p-5 lg:h-[430px]">
      {url ? (
        isScanning ? (
          <img
            src={url}
            alt={`Pratinjau pemeriksaan ${name}`}
            width={dimensions?.width || 800}
            height={dimensions?.height || 500}
            fetchPriority="high"
            className="h-full w-full object-contain"
          />
        ) : (
          <button
            type="button"
            onClick={onOpenLightbox}
            aria-label={`Perbesar gambar ${name} untuk inspeksi detail penuh`}
            className="group relative flex size-full items-center justify-center overflow-hidden rounded-lg"
          >
            <img
              src={url}
              alt={`Pratinjau pemeriksaan ${name}`}
              width={dimensions?.width || 800}
              height={dimensions?.height || 500}
              fetchPriority="high"
              className="h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.025] animate-zoom-reveal"
            />
            <span className="pointer-events-none absolute right-2 bottom-2 inline-flex items-center gap-1.5 rounded-lg border border-line bg-card/95 px-2.5 py-1.5 text-xs font-semibold text-ink shadow-card transition group-hover:border-edge">
              <ZoomIn className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
              <span>Perbesar</span>
            </span>
          </button>
        )
      ) : (
        <p className="px-4 text-center text-sm text-muted">
          Pratinjau gambar asli tidak tersimpan pada riwayat lama
        </p>
      )}

      {isScanning && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-ink/8" />
          <div className="absolute inset-x-3 animate-scan">
            <div className="h-0.5 bg-emerald-brand" />
          </div>
        </div>
      )}
    </div>
  )
}

function ScanningPanel({ onCancel }) {
  return (
    <section
      aria-labelledby="scanning-heading"
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-line bg-card/95 p-5 shadow-card sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-safe-border bg-safe-bg text-safe-fg">
          <Loader2 className="size-5 animate-spin" strokeWidth={2.25} aria-hidden="true" />
        </span>
        <div>
          <h2 id="scanning-heading" className="text-base font-bold text-ink">
            Menganalisis struktur gambar
          </h2>
          <p className="text-xs text-muted">Mohon tunggu, inferensi model sedang berjalan</p>
        </div>
      </div>

      <ol className="mt-5 space-y-2.5 border-t border-line pt-4 text-xs text-muted sm:text-[13px]">
        <li className="flex items-center gap-2.5 font-medium text-ink">
          <span className="size-2 shrink-0 rounded-full bg-emerald-brand" aria-hidden="true" />
          <span>Menyesuaikan bidang tengah gambar (224x224 center-crop)</span>
        </li>
        <li className="flex items-center gap-2.5 font-medium text-ink">
          <span className="size-2 shrink-0 rounded-full bg-emerald-brand" aria-hidden="true" />
          <span>Menghitung probabilitas Swin Transformer dua arah (TTA)</span>
        </li>
        <li className="flex items-center gap-2.5">
          <span className="size-2 shrink-0 rounded-full bg-edge" aria-hidden="true" />
          <span>Menyusun peta aktivasi Grad-CAM dan membaca atribut EXIF</span>
        </li>
      </ol>

      <button
        type="button"
        onClick={onCancel}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-edge bg-subtle px-4 text-sm font-semibold text-ink transition hover:bg-inset"
      >
        Batalkan Pemeriksaan
      </button>
    </section>
  )
}

function VerdictCard({ result, verdict, threshold }) {
  const animatedProb = useCountUp(result.probability)
  const exactAi =
    typeof result.exactAiProb === 'number' ? result.exactAiProb.toFixed(1) : `${result.probability}.0`
  const exactNonAi =
    typeof result.exactNonAiProb === 'number'
      ? result.exactNonAiProb.toFixed(1)
      : (100 - Number(exactAi)).toFixed(1)
  const summaryText = result.verdictText || verdict.text
  const Icon = verdict.tone === 'safe' ? ShieldCheck : AlertTriangle

  return (
    <section
      aria-labelledby="verdict-heading"
      className="rounded-2xl border border-line bg-card/95 p-5 shadow-card animate-rise sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl border ${verdict.pillClass}`}
          aria-hidden="true"
        >
          <Icon className="size-5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted">Kesimpulan Pemeriksaan</p>
          <h2
            id="verdict-heading"
            className="mt-0.5 text-xl leading-snug font-extrabold tracking-[-0.025em] text-ink"
          >
            {verdict.headline}
          </h2>
        </div>
      </div>

      <p className="mt-3.5 text-sm leading-relaxed text-muted">{summaryText}</p>

      <div className="mt-5 rounded-xl border border-line bg-subtle/60 p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted">Skor Indikasi Buatan AI</p>
            <p className="mt-1 flex items-baseline gap-1.5 font-mono text-[2rem] leading-none font-bold tabular-nums text-ink">
              <span>{animatedProb}%</span>
              <span className="text-xs font-medium text-muted">({exactAi}%)</span>
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-medium text-muted">Skor Keaslian Foto</p>
            <p className="mt-1 font-mono text-lg leading-none font-bold tabular-nums text-ink">
              {exactNonAi}%
            </p>
          </div>
        </div>

        <div className="relative mt-4 pt-1">
          <div
            className="h-3 w-full overflow-hidden rounded-full bg-inset"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={result.probability}
            aria-label={`Skor indikasi buatan AI ${result.probability} persen, ambang deteksi ${threshold} persen`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${verdict.barClass}`}
              style={{ width: `${animatedProb}%` }}
            />
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 bottom-0 flex flex-col items-center"
            style={{ left: `${Math.min(96, Math.max(4, threshold))}%` }}
          >
            <span className="h-5 w-0.5 -translate-x-1/2 bg-ink" />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
          <span>
            <span className="font-mono">0%</span> Asli
          </span>
          <span className="font-semibold text-ink">
            Ambang AI: <span className="font-mono">{Math.round(threshold)}%</span>
          </span>
          <span>
            <span className="font-mono">100%</span> AI
          </span>
        </div>
      </div>
    </section>
  )
}

function ConfidenceCard({ result, threshold }) {
  const { percent, level } = getConfidence(
    result.probability,
    result.confidencePercent,
    result.modelConfidence,
    threshold,
  )
  const animatedWidth = useCountUp(percent, 800)

  return (
    <section
      aria-labelledby="confidence-heading"
      className="rounded-2xl border border-line bg-card/95 p-4 shadow-card animate-rise sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="confidence-heading" className="text-sm font-bold text-ink">
          Keyakinan Keputusan Model
        </h2>
        <span className="text-xs font-bold text-ink">
          {level} <span className="font-mono">({percent}%)</span>
        </span>
      </div>

      <div
        className="mt-2.5 h-2 overflow-hidden rounded-full bg-inset"
        role="progressbar"
        aria-valuemin={50}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${level}, ${percent} persen`}
        aria-labelledby="confidence-heading"
      >
        <div
          className="h-full rounded-full bg-action transition-all duration-500"
          style={{ width: `${animatedWidth}%` }}
        />
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-muted tabular-nums">
        Semakin jauh skor gambar dari ambang{' '}
        <span className="font-semibold text-ink">{Math.round(threshold)}%</span>, semakin tegas
        pemisahan kelas antara foto kamera dan gambar sintetis.
      </p>
    </section>
  )
}

function TechnicalSummaryCard({ result, fallbackDimensions, fallbackSize, fallbackFormat }) {
  const imageMeta = result.details?.imageMeta
  const modelInfo = result.details?.modelInfo

  const width = imageMeta?.width || fallbackDimensions?.width
  const height = imageMeta?.height || fallbackDimensions?.height
  const hasResolution = Boolean(width && height)
  const resolution = hasResolution ? `${width} x ${height} px` : 'Tidak tercatat'

  const formatLabel = imageMeta?.format || fallbackFormat || null
  const byteSize = imageMeta?.file_size_bytes ?? fallbackSize
  const hasFileData = Boolean(formatLabel || byteSize)

  const exifStatus =
    imageMeta == null
      ? 'Lihat tab metadata'
      : imageMeta.has_exif
        ? [imageMeta.camera_make, imageMeta.camera_model].filter(Boolean).join(' ') || 'EXIF tersedia'
        : 'Tidak ditemukan EXIF'

  const engineLabel = modelInfo
    ? `${modelInfo.architecture === 'swin_transformer' ? 'Swin Transformer' : modelInfo.architecture}${modelInfo.tta ? ' · TTA 2x' : ''}`
    : 'Swin Transformer'

  return (
    <section
      aria-labelledby="tech-summary-heading"
      className="rounded-2xl border border-line bg-card/95 p-4 shadow-card sm:p-5"
    >
      <h2 id="tech-summary-heading" className="text-sm font-bold text-ink">
        Ringkasan Teknis File & Mesin
      </h2>

      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-subtle/50 p-3">
          <dt className="text-[11px] font-medium text-muted">Resolusi</dt>
          <dd
            className={`mt-1 truncate text-xs font-semibold text-ink ${hasResolution ? 'font-mono' : ''}`}
            title={resolution}
          >
            {resolution}
          </dd>
        </div>

        <div className="rounded-xl border border-line bg-subtle/50 p-3">
          <dt className="text-[11px] font-medium text-muted">Format & Ukuran</dt>
          <dd className="mt-1 truncate text-xs font-semibold text-ink">
            {hasFileData ? (
              <span className="font-mono">
                {[formatLabel, byteSize ? formatBytes(byteSize) : null].filter(Boolean).join(' · ')}
              </span>
            ) : (
              'Tidak tercatat'
            )}
          </dd>
        </div>

        <div className="rounded-xl border border-line bg-subtle/50 p-3">
          <dt className="text-[11px] font-medium text-muted">Metadata Kamera</dt>
          <dd className="mt-1 truncate text-xs font-semibold text-ink" title={exifStatus}>
            {exifStatus}
          </dd>
        </div>

        <div className="rounded-xl border border-line bg-subtle/50 p-3">
          <dt className="text-[11px] font-medium text-muted">Mesin Inferensi</dt>
          <dd className="mt-1 truncate text-xs font-semibold text-ink" title={engineLabel}>
            {engineLabel}
          </dd>
        </div>
      </dl>
    </section>
  )
}
