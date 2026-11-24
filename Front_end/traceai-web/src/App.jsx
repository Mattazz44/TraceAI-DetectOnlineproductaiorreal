import { useCallback, useEffect, useRef, useState } from 'react'
import AnalysisScreen from './components/AnalysisScreen.jsx'
import EvidenceScreen from './components/EvidenceScreen.jsx'
import Footer from './components/Footer.jsx'
import Header from './components/Header.jsx'
import HistoryScreen from './components/HistoryScreen.jsx'
import HomeScreen from './components/HomeScreen.jsx'
import InteractiveBackground from './components/InteractiveBackground.jsx'
import { useRecentScans } from './hooks/useRecentScans.js'
import { useTheme } from './hooks/useTheme.js'
import { ACCEPTED_TYPES, delay, detectImage, validateImage } from './lib/detect.js'
import { createThumbnail, formatMimeShort, inspectImageDimensions } from './lib/image.js'

const ACCEPT = ACCEPTED_TYPES.join(',')
const MIN_SCAN_MS = 650
const BG_MOTION_KEY = 'traceai:bg-paused'

function loadBgPaused() {
  try {
    return localStorage.getItem(BG_MOTION_KEY) === 'true'
  } catch {
    return false
  }
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('landing')
  const [staged, setStaged] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)
  const [bgPaused, setBgPaused] = useState(loadBgPaused)

  const { theme, toggleTheme } = useTheme()
  const { scans, addScan, removeScan, clearScans } = useRecentScans()

  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const abortRef = useRef(null)

  const toggleBgMotion = useCallback(() => {
    setBgPaused((prev) => {
      const next = !prev
      try {
        localStorage.setItem(BG_MOTION_KEY, String(next))
      } catch {
        /* ignore storage errors */
      }
      return next
    })
  }, [])

  const stagedUrl = staged?.previewUrl
  useEffect(() => {
    if (!stagedUrl?.startsWith('blob:')) return
    return () => URL.revokeObjectURL(stagedUrl)
  }, [stagedUrl])

  const analysisUrl = analysis?.url
  useEffect(() => {
    if (!analysisUrl?.startsWith('blob:')) return
    return () => URL.revokeObjectURL(analysisUrl)
  }, [analysisUrl])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [currentScreen])

  const navigate = useCallback((screen, { replace = false } = {}) => {
    const depth = history.state?.depth ?? 0
    if (replace && depth > 0) history.replaceState({ screen, depth }, '')
    else history.pushState({ screen, depth: depth + 1 }, '')
    setCurrentScreen(screen)
  }, [])

  const goBack = useCallback(() => {
    if ((history.state?.depth ?? 0) > 0) history.back()
    else setCurrentScreen('landing')
  }, [])

  const goLanding = useCallback((clearDraft = false) => {
    if (clearDraft) {
      setStaged(null)
      setError(null)
    }
    const depth = history.state?.depth ?? 0
    if (depth > 0) history.go(-depth)
    else setCurrentScreen('landing')
  }, [])

  useEffect(() => {
    if (history.state?.screen) history.replaceState(null, '')
    const onPop = (e) => setCurrentScreen(e.state?.screen ?? 'landing')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    if (currentScreen === 'landing' || currentScreen === 'history') {
      abortRef.current?.abort()
      setAnalysis(null)
    }
  }, [currentScreen])

  const handleStageFile = useCallback(
    async (file) => {
      const validationError = validateImage(file)
      if (validationError) {
        setError(validationError)
        if (currentScreen !== 'landing') goLanding(false)
        return
      }

      setError(null)
      const previewUrl = URL.createObjectURL(file)
      const dimensions = await inspectImageDimensions(file)
      setStaged({ file, previewUrl, dimensions })
      if (currentScreen !== 'landing') {
        goLanding(false)
      }
    },
    [currentScreen, goLanding],
  )

  const handleClearStaged = useCallback(() => {
    setStaged(null)
    setError(null)
  }, [])

  const handleStartScan = useCallback(async () => {
    if (!staged?.file) return
    const { file, dimensions } = staged

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const key = crypto.randomUUID?.() ?? String(Date.now())
    const scanPreviewUrl = URL.createObjectURL(file)
    setError(null)

    setAnalysis({
      key,
      name: file.name,
      url: scanPreviewUrl,
      dimensions,
      fileSize: file.size,
      fileFormat: formatMimeShort(file.type),
      status: 'scanning',
      result: null,
    })

    const onInnerScreen = ['analysis', 'evidence'].includes(history.state?.screen)
    navigate('analysis', { replace: onInnerScreen })

    try {
      const [res, thumbnail] = await Promise.all([
        detectImage(file, { signal: controller.signal }),
        createThumbnail(file),
        delay(MIN_SCAN_MS, controller.signal),
      ])
      if (controller.signal.aborted) return

      setStaged(null)
      setAnalysis((cur) => (cur?.key === key ? { ...cur, status: 'done', result: res } : cur))

      addScan({
        id: res.scanId || key,
        name: file.name,
        probability: res.probability,
        exactAiProb: res.exactAiProb,
        exactNonAiProb: res.exactNonAiProb,
        isAiGenerated: res.isAiGenerated,
        threshold: res.threshold,
        classification: res.classification ?? null,
        modelConfidence: res.modelConfidence ?? null,
        confidencePercent: res.confidencePercent ?? null,
        verdictText: res.verdictText ?? null,
        modelFile: res.modelFile ?? null,
        isFallbackModel: res.isFallbackModel ?? false,
        modelWarning: res.modelWarning ?? null,
        details: res.details ?? null,
        thumbnail,
        scannedAt: Date.now(),
      })
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(
        err?.message || 'Gagal menganalisis gambar. Pastikan server Backend berjalan lalu coba lagi.',
      )
      goLanding(false)
    }
  }, [staged, navigate, addScan, goLanding])

  const handleSelectScan = useCallback(
    (scan) => {
      abortRef.current?.abort()
      setError(null)
      const threshold = scan.threshold ?? 65
      const result = {
        scanId: scan.id ?? null,
        timestamp: scan.scannedAt ? new Date(scan.scannedAt).toISOString() : null,
        probability: scan.probability,
        exactAiProb: scan.exactAiProb ?? scan.probability,
        exactNonAiProb: scan.exactNonAiProb ?? Math.max(0, 100 - scan.probability),
        isAiGenerated:
          typeof scan.isAiGenerated === 'boolean'
            ? scan.isAiGenerated
            : scan.probability >= threshold,
        threshold,
        classification: scan.classification ?? null,
        modelConfidence: scan.modelConfidence ?? null,
        confidencePercent: scan.confidencePercent ?? scan.confidence ?? undefined,
        verdictText: scan.verdictText ?? null,
        modelFile: scan.modelFile ?? null,
        isFallbackModel: scan.isFallbackModel ?? false,
        modelWarning: scan.modelWarning ?? null,
        details: scan.details ?? null,
      }

      setAnalysis({
        key: `saved-${scan.id}-${Date.now()}`,
        name: scan.name,
        url: scan.thumbnail ?? null,
        dimensions: scan.details?.imageMeta ?? null,
        fileSize: scan.details?.imageMeta?.file_size_bytes ?? null,
        fileFormat: scan.details?.imageMeta?.format ?? null,
        status: 'done',
        result,
      })

      const onInnerScreen = ['analysis', 'evidence'].includes(history.state?.screen)
      navigate('analysis', { replace: onInnerScreen })
    },
    [navigate],
  )

  useEffect(() => {
    const onPaste = (e) => {
      const targetTag = e.target?.tagName
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') return
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'))
      const file = item?.getAsFile()
      if (file) handleStageFile(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [handleStageFile])

  const onInputChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) handleStageFile(file)
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'history':
        return (
          <HistoryScreen
            scans={scans}
            onBack={() => goLanding(false)}
            onNewScan={() => goLanding(true)}
            onSelectScan={handleSelectScan}
            onRemoveScan={removeScan}
            onClearScans={clearScans}
          />
        )

      case 'evidence':
        if (analysis?.status === 'done') {
          return (
            <EvidenceScreen
              key={`${analysis.key}-evidence`}
              scan={analysis}
              onBack={goBack}
              onHome={() => goLanding(true)}
            />
          )
        }
      // falls through when evidence has no completed scan

      case 'analysis':
        if (analysis) {
          return (
            <AnalysisScreen
              key={analysis.key}
              scan={analysis}
              onBack={goBack}
              onRescan={() => goLanding(true)}
              onShowEvidence={() => navigate('evidence')}
            />
          )
        }
      // falls through to landing

      default:
        return (
          <HomeScreen
            staged={staged}
            error={error}
            scans={scans}
            onStageFile={handleStageFile}
            onStartScan={handleStartScan}
            onClearStaged={handleClearStaged}
            onTakePhoto={() => cameraInputRef.current?.click()}
            onPickGallery={() => galleryInputRef.current?.click()}
            onSelectScan={handleSelectScan}
            onRemoveScan={removeScan}
            onClearScans={clearScans}
            onOpenHistory={() => navigate('history')}
          />
        )
    }
  }

  return (
    <div className="relative isolate flex min-h-dvh flex-col text-ink">
      <InteractiveBackground theme={theme} paused={bgPaused} />

      <Header
        activeScreen={currentScreen}
        scansCount={scans.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigateHome={() => goLanding(false)}
        onNavigateHistory={() => {
          if (currentScreen !== 'history') navigate('history')
        }}
      />

      <main id="pemeriksaan" className="flex-1">
        {renderScreen()}
      </main>

      <Footer bgPaused={bgPaused} onToggleBgMotion={toggleBgMotion} />

      <input
        ref={cameraInputRef}
        type="file"
        accept={ACCEPT}
        capture="environment"
        onChange={onInputChange}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept={ACCEPT}
        onChange={onInputChange}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  )
}
