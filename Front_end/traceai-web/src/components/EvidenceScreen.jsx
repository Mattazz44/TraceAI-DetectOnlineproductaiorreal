import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  Eye,
  Flame,
  ImageIcon,
  Info,
  RotateCcw,
  Share2,
  ZoomIn,
} from 'lucide-react'
import ImageLightbox from './ImageLightbox.jsx'
import ScoreBadge from './ScoreBadge.jsx'
import Toast from './Toast.jsx'
import { STATUS, buildEvidence } from '../lib/evidence.js'
import { formatBytes } from '../lib/image.js'
import { shareOrCopy } from '../lib/share.js'
import { getVerdict } from '../lib/verdict.js'

const TABS = [
  { id: 'findings', label: 'Indikator Visual' },
  { id: 'metadata', label: 'Metadata & Parameter' },
]

export default function EvidenceScreen({ scan, onBack, onHome }) {
  const { findings, regions, heatmap, imageMeta, modelInfo } = buildEvidence(scan.result)
  const [activeTab, setActiveTab] = useState('findings')
  const [activeFindingId, setActiveFindingId] = useState(findings[0]?.id ?? null)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showBoxes, setShowBoxes] = useState(true)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [isSharing, setIsSharing] = useState(false)
  const [copied, setCopied] = useState(false)

  const headingRef = useRef(null)
  const tabRefs = useRef({})
  const cardRefs = useRef({})

  useEffect(() => {
    window.scrollTo(0, 0)
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  const toggleFinding = (id) => {
    setActiveFindingId((cur) => (cur === id ? null : id))
  }

  const focusFindingFromBox = (id) => {
    if (!id) return
    setActiveTab('findings')
    setActiveFindingId(id)
    requestAnimationFrame(() => {
      cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const handleTabKeyDown = (e, index) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const nextIndex =
      e.key === 'ArrowRight'
        ? (index + 1) % TABS.length
        : (index - 1 + TABS.length) % TABS.length
    const nextTab = TABS[nextIndex]
    setActiveTab(nextTab.id)
    tabRefs.current[nextTab.id]?.focus()
  }

  const dismissToast = useCallback(() => setToast(null), [])

  const handleShare = async () => {
    if (isSharing) return
    setIsSharing(true)

    const { probability, isAiGenerated, threshold = 65, verdictText } = scan.result
    const verdict = getVerdict(probability, isAiGenerated, threshold)
    const lines = findings.map((f) => `- ${f.title}: ${STATUS[f.status].label}`)
    const text = [
      `Laporan Pemeriksaan TraceAI untuk "${scan.name}": ${verdict.headline} (${probability}% skor AI).`,
      verdictText || verdict.text,
      lines.length ? `\nIndikator forensik:\n${lines.join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    try {
      const outcome = await shareOrCopy({
        title: `TraceAI: ${scan.name}`,
        text,
        url: `${window.location.origin}${window.location.pathname}`,
      })

      if (outcome === 'copied') {
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
        setToast({
          id: Date.now(),
          title: 'Ringkasan laporan berhasil disalin',
          message: 'Anda dapat menempelkannya langsung ke ruang diskusi atau catatan audit.',
        })
      } else if (outcome === 'failed') {
        setToast({
          id: Date.now(),
          tone: 'error',
          title: 'Gagal menyalin laporan',
          message: 'Peramban menolak akses papan klip. Silakan coba kembali.',
        })
      }
    } finally {
      setIsSharing(false)
    }
  }

  const threshold = scan.result?.threshold ?? 65
  const dimensions = imageMeta || scan.dimensions || null

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-card/95 text-ink transition hover:border-edge hover:bg-subtle active:scale-95"
            aria-label="Kembali ke ringkasan hasil"
          >
            <ChevronLeft className="size-5" strokeWidth={2.25} aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-muted" title={scan.name}>
              {scan.name}
            </p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-lg leading-snug font-extrabold tracking-[-0.025em] text-ink outline-none sm:text-xl"
            >
              Bukti Temuan & Metadata
            </h1>
          </div>
        </div>

        <ScoreBadge
          probability={scan.result.probability}
          isAiGenerated={scan.result.isAiGenerated}
          threshold={threshold}
          size="lg"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 md:grid-cols-12 md:gap-7 lg:gap-8">
        <div className="space-y-4 md:sticky md:top-20 md:col-span-6">
          <AnnotatedViewport
            url={scan.url}
            name={scan.name}
            dimensions={dimensions}
            regions={regions}
            heatmap={heatmap}
            showHeatmap={showHeatmap}
            showBoxes={showBoxes}
            onToggleHeatmap={() => setShowHeatmap((v) => !v)}
            onToggleBoxes={() => setShowBoxes((v) => !v)}
            onOpenLightbox={() => setLightboxOpen(true)}
            activeFindingId={activeFindingId}
            findings={findings}
            onSelectRegion={focusFindingFromBox}
          />

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleShare}
              aria-busy={isSharing}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-brand px-4 text-sm font-semibold text-white transition hover:bg-emerald-brand-hover active:scale-[0.99]"
            >
              {copied ? (
                <>
                  <Check className="size-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                  <span>Laporan Tersalin</span>
                </>
              ) : (
                <>
                  <Share2 className="size-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                  <span>Salin & Bagikan Laporan</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onHome}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-edge bg-card/95 px-4 text-sm font-semibold text-ink transition hover:bg-subtle active:scale-[0.99]"
            >
              <RotateCcw className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span>Periksa Gambar Baru</span>
            </button>
          </div>
        </div>

        <div className="md:col-span-6">
          <div
            role="tablist"
            aria-label="Kategori rincian bukti"
            className="grid grid-cols-2 gap-1.5 rounded-2xl border border-line bg-subtle/90 p-1.5"
          >
            {TABS.map((tab, index) => {
              const selected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[tab.id] = el
                  }}
                  id={`tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  className={[
                    'min-h-11 rounded-xl px-2.5 text-xs font-bold transition sm:px-3 sm:text-sm',
                    selected ? 'bg-card text-ink shadow-card' : 'text-muted hover:text-ink',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {activeTab === 'findings' ? (
            <section
              id="panel-findings"
              role="tabpanel"
              aria-labelledby="tab-findings"
              className="mt-4 space-y-3"
            >
              <h2 className="sr-only">Daftar Indikator Forensik</h2>

              {findings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line bg-card/95 p-6 text-center text-sm text-muted">
                  Rincian indikator tidak tersedia pada data pemindaian ini.
                </div>
              ) : (
                <ul className="space-y-3">
                  {findings.map((finding) => (
                    <li
                      key={finding.id}
                      ref={(el) => {
                        cardRefs.current[finding.id] = el
                      }}
                      className="scroll-my-24"
                    >
                      <FindingCard
                        finding={finding}
                        expanded={activeFindingId === finding.id}
                        regionCount={regions.filter((r) => r.finding === finding.id).length}
                        onToggle={() => toggleFinding(finding.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <section
              id="panel-metadata"
              role="tabpanel"
              aria-labelledby="tab-metadata"
              className="mt-4 space-y-4"
            >
              <h2 className="sr-only">Rincian Metadata dan Konfigurasi Mesin</h2>
              <MetadataPanel scan={scan} imageMeta={imageMeta} modelInfo={modelInfo} />
            </section>
          )}
        </div>
      </div>

      <ImageLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        url={scan.url}
        name={scan.name}
        dimensions={dimensions}
        heatmap={heatmap}
        regions={regions}
        showHeatmap={showHeatmap}
        showBoxes={showBoxes}
        onToggleHeatmap={() => setShowHeatmap((v) => !v)}
        onToggleBoxes={() => setShowBoxes((v) => !v)}
      />

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  )
}

function AnnotatedViewport({
  url,
  name,
  dimensions,
  regions,
  heatmap,
  showHeatmap,
  showBoxes,
  onToggleHeatmap,
  onToggleBoxes,
  onOpenLightbox,
  activeFindingId,
  findings,
  onSelectRegion,
}) {
  const titleOf = (id) => findings.find((f) => f.id === id)?.title
  const hasAbnormalFinding = findings.some(
    (f) => f.status === 'janggal' || f.status === 'ragu',
  )

  const regionButtons =
    showBoxes &&
    regions.map((r) => {
      const isActive = activeFindingId && r.finding === activeFindingId
      const isDimmed = activeFindingId && r.finding !== activeFindingId
      const label = titleOf(r.finding)
      return (
        <button
          key={r.id}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSelectRegion(r.finding)
          }}
          disabled={!r.finding}
          aria-label={label ? `Sorotan area: ${label}` : 'Sorotan area janggal'}
          className={[
            'absolute z-10 rounded-lg border-2 border-ai-bar transition-all duration-200',
            isActive ? 'bg-ai-bar/25 ring-2 ring-white/80' : 'bg-ai-bar/15 hover:bg-ai-bar/25',
            isDimmed ? 'opacity-45' : 'opacity-100',
          ].join(' ')}
          style={{
            left: `${r.x * 100}%`,
            top: `${r.y * 100}%`,
            width: `${r.w * 100}%`,
            height: `${r.h * 100}%`,
          }}
        >
          {isActive && label && (
            <span className="absolute -top-6 left-0 rounded bg-ink px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-canvas">
              {label}
            </span>
          )}
        </button>
      )
    })

  let statusCaption = 'Tidak ditemukan anomali lokal pada bidang gambar'
  if (regions.length > 0) {
    statusCaption = `${regions.length} area aktivasi tertinggi ditandai`
  } else if (hasAbnormalFinding) {
    statusCaption = 'Indikasi terdeteksi merata secara menyeluruh'
  }

  return (
    <section
      aria-labelledby="viewport-heading"
      className="rounded-2xl border border-line bg-card/95 p-3.5 shadow-card sm:p-4"
    >
      <h2 id="viewport-heading" className="sr-only">
        Peta Area dan Anotasi Visual
      </h2>

      <div className="forensic-frame flex min-h-[280px] w-full items-center justify-center overflow-hidden rounded-xl border border-line bg-stage p-4 sm:min-h-[340px] sm:p-5 lg:min-h-[400px]">
        {url ? (
          <div className="group relative inline-flex max-w-full items-center justify-center transition-transform duration-300 ease-out hover:scale-[1.02] animate-zoom-reveal">
            <img
              src={url}
              alt={`Gambar ${name} dengan lapisan inspeksi visual`}
              width={dimensions?.width || 800}
              height={dimensions?.height || 500}
              fetchPriority="high"
              className="block max-h-[248px] max-w-full h-auto w-auto object-contain sm:max-h-[308px] lg:max-h-[368px]"
            />

            <button
              type="button"
              onClick={onOpenLightbox}
              aria-label={`Perbesar gambar ${name} untuk inspeksi tekstur penuh`}
              className="absolute inset-0 z-0 rounded-sm bg-transparent"
            />

            {heatmap && showHeatmap && (
              <img
                src={heatmap}
                alt=""
                width={dimensions?.width || 800}
                height={dimensions?.height || 500}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-[5] size-full object-fill opacity-80"
              />
            )}

            {regionButtons}
          </div>
        ) : (
          <div className="relative flex size-full min-h-[240px] flex-col items-center justify-center p-6 text-center">
            <div className="flex flex-col items-center text-muted">
              <ImageIcon className="size-10 opacity-50" strokeWidth={1.5} aria-hidden="true" />
              <p className="mt-2 text-xs">Gambar asli tidak tersimpan pada entri riwayat ini</p>
            </div>
            {heatmap && showHeatmap && (
              <img
                src={heatmap}
                alt=""
                width={224}
                height={224}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 size-full object-contain opacity-75"
              />
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted">{statusCaption}</p>

        <div className="flex flex-wrap items-center gap-2">
          {url && (
            <button
              type="button"
              onClick={onOpenLightbox}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-subtle px-3 text-xs font-semibold text-ink transition hover:border-edge"
            >
              <ZoomIn className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span>Perbesar</span>
            </button>
          )}

          {regions.length > 0 && (
            <button
              type="button"
              onClick={onToggleBoxes}
              aria-pressed={showBoxes}
              className={[
                'inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition',
                showBoxes
                  ? 'border-ink bg-action text-action-fg'
                  : 'border-line bg-subtle text-ink hover:border-edge',
              ].join(' ')}
            >
              <Eye className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span className="tabular-nums">Kotak Area ({regions.length})</span>
            </button>
          )}

          {heatmap && (
            <button
              type="button"
              onClick={onToggleHeatmap}
              aria-pressed={showHeatmap}
              className={[
                'inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition',
                showHeatmap
                  ? 'border-ink bg-action text-action-fg'
                  : 'border-line bg-subtle text-ink hover:border-edge',
              ].join(' ')}
            >
              <Flame className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span>Peta Panas</span>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function FindingCard({ finding, expanded, regionCount, onToggle }) {
  const status = STATUS[finding.status] ?? STATUS.ragu
  const panelId = `finding-panel-${finding.id}`

  return (
    <article
      className={[
        'rounded-2xl border bg-card/95 shadow-card transition',
        expanded ? 'border-edge' : 'border-line',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="w-full rounded-2xl p-4 text-left sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-ink">{finding.title}</h3>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${status.className}`}>
              {status.label}
            </span>
            <ChevronDown
              className={`size-4 text-muted transition-transform duration-200 ${expanded ? 'rotate-180 text-ink' : ''}`}
              strokeWidth={2}
              aria-hidden="true"
            />
          </div>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-muted">{finding.description}</p>
      </button>

      {expanded && (
        <div id={panelId} className="border-t border-line px-4 pt-3 pb-4 sm:px-5">
          <div className="flex items-start gap-2.5 rounded-xl bg-subtle/70 p-3 text-xs leading-relaxed text-ink">
            <Info className="mt-0.5 size-4 shrink-0 text-muted" strokeWidth={2} aria-hidden="true" />
            <div>
              <p className="font-semibold text-ink">Cara memeriksa manual:</p>
              <p className="mt-0.5 text-muted">{finding.tip}</p>
              {regionCount > 0 && (
                <p className="mt-1.5 text-xs font-semibold text-ai-fg tabular-nums">
                  Terkait dengan {regionCount} kotak sorotan pada gambar.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

function MetadataPanel({ scan, imageMeta, modelInfo }) {
  const result = scan.result ?? {}
  const dims = imageMeta || scan.dimensions
  const hasDims = Boolean(dims?.width && dims?.height)
  const widthHeight = hasDims ? `${dims.width} x ${dims.height} px` : 'Tidak tercatat'
  const formatText = imageMeta?.format || scan.fileFormat || null
  const byteSize = imageMeta?.file_size_bytes ?? scan.fileSize
  const hasFormatOrSize = Boolean(formatText || byteSize)
  const formatSizeValue = hasFormatOrSize
    ? [formatText, byteSize ? formatBytes(byteSize) : null].filter(Boolean).join(' · ')
    : 'Tidak tercatat'

  const cameraDevice =
    [imageMeta?.camera_make, imageMeta?.camera_model].filter(Boolean).join(' ') || 'Tidak tercatat'
  const softwareText = imageMeta?.software || 'Tidak tercatat'
  const hasCaptureTime = Boolean(imageMeta?.datetime_original)
  const captureTime = imageMeta?.datetime_original || 'Tidak tercatat'
  const exifBadge =
    imageMeta == null
      ? 'Tidak tercatat'
      : imageMeta.has_exif
        ? 'Atribut EXIF ditemukan'
        : 'Kosong / telah dihapus'

  const hasScanTime = Boolean(result.timestamp)
  const scanTime = hasScanTime ? new Date(result.timestamp).toLocaleString('id-ID') : 'Sesi lokal'

  return (
    <>
      <article className="rounded-2xl border border-line bg-card/95 p-4 shadow-card sm:p-5">
        <h3 className="text-sm font-bold text-ink">Metadata File & Kamera (EXIF)</h3>
        <p className="mt-1 text-xs text-muted">
          Data teknis yang diekstrak langsung dari header berkas gambar yang diunggah.
        </p>

        <dl className="mt-4 divide-y divide-line text-xs sm:text-sm">
          <MetaRow label="Nama Berkas" value={scan.name} />
          <MetaRow label="Dimensi Asli" value={widthHeight} mono={hasDims} />
          <MetaRow label="Format & Ukuran" value={formatSizeValue} mono={hasFormatOrSize} />
          <MetaRow label="Status EXIF" value={exifBadge} />
          <MetaRow label="Perangkat Kamera" value={cameraDevice} />
          <MetaRow label="Perangkat Lunak" value={softwareText} />
          <MetaRow label="Waktu Pengambilan" value={captureTime} mono={hasCaptureTime} />
        </dl>
      </article>

      <article className="rounded-2xl border border-line bg-card/95 p-4 shadow-card sm:p-5">
        <h3 className="text-sm font-bold text-ink">Parameter Mesin Deteksi</h3>
        <p className="mt-1 text-xs text-muted">
          Konfigurasi model klasifikasi dan kalibrasi ambang yang digunakan pada pemeriksaan ini.
        </p>

        <dl className="mt-4 divide-y divide-line text-xs sm:text-sm">
          <MetaRow
            label="ID Pemindaian"
            value={result.scanId || 'Lokal'}
            mono={Boolean(result.scanId)}
          />
          <MetaRow
            label="Arsitektur"
            value={
              modelInfo?.architecture === 'swin_transformer'
                ? 'Swin Transformer'
                : modelInfo?.architecture || 'Swin Transformer'
            }
          />
          <MetaRow
            label="Versi Bobot"
            value={modelInfo?.version || result.modelFile || 'v6_product_matched'}
            mono
          />
          <MetaRow
            label="Ukuran Input & Metode"
            value={
              modelInfo
                ? `${modelInfo.image_size}x${modelInfo.image_size} · ${modelInfo.preprocessing}`
                : '224x224 · center_crop_fit'
            }
            mono
          />
          <MetaRow
            label="Augmentasi Uji (TTA)"
            value={modelInfo?.tta === false ? 'Nonaktif' : 'Aktif (2 arah horizontal)'}
          />
          <MetaRow
            label="Ambang Keputusan AI"
            value={`${Math.round(result.threshold ?? 65)}%`}
            mono
          />
          <MetaRow label="Waktu Pemeriksaan" value={scanTime} />
        </dl>
      </article>
    </>
  )
}

function MetaRow({ label, value, mono = false }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd
        className={[
          'min-w-0 break-all font-semibold text-ink sm:text-right',
          mono ? 'font-mono text-xs' : '',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  )
}
