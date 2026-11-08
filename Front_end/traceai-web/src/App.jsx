import { useCallback, useEffect, useRef, useState } from 'react'
import HomeScreen from './components/HomeScreen.jsx'
import HistoryScreen from './components/HistoryScreen.jsx'
import AnalysisScreen from './components/AnalysisScreen.jsx'
import EvidenceScreen from './components/EvidenceScreen.jsx'
import { useRecentScans } from './hooks/useRecentScans.js'
import {
  ACCEPTED_TYPES,
  USING_MOCK,
  delay,
  deriveDetails,
  detectImage,
  validateImage,
} from './lib/detect.js'
import { createThumbnail } from './lib/image.js'

const ACCEPT = ACCEPTED_TYPES.join(',')
// Minimum time the scanning state stays visible, so fast responses don't flash.
const MIN_SCAN_MS = 1400

/**
 * Screens: 'landing' | 'history' | 'analysis' | 'evidence'
 *
 * Every navigation also pushes a browser-history entry ({ screen, depth }), so
 * the phone's hardware back button / browser back behaves like the in-app
 * back buttons. `popstate` is the single place that syncs history → state.
 */
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('landing')
  /** Data for the analysis/evidence screens: { key, name, url, status: 'scanning'|'done', result } */
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)

  const { scans, addScan } = useRecentScans()

  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const abortRef = useRef(null)

  // Release the preview object URL when it's no longer used.
  const previewUrl = analysis?.url
  useEffect(() => {
    if (!previewUrl?.startsWith('blob:')) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  // Each screen starts at the top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [currentScreen])

  /* ---------------- navigation ---------------- */

  /** Go forward to `screen`. Use `replace` to swap the current entry instead of stacking. */
  const navigate = useCallback((screen, { replace = false } = {}) => {
    const depth = history.state?.depth ?? 0
    if (replace && depth > 0) history.replaceState({ screen, depth }, '')
    else history.pushState({ screen, depth: depth + 1 }, '')
    setCurrentScreen(screen)
  }, [])

  /** One step back (same as the hardware back button). */
  const goBack = useCallback(() => {
    if ((history.state?.depth ?? 0) > 0) history.back() // → popstate
    else setCurrentScreen('landing')
  }, [])

  /** Jump straight back to the landing page, unwinding all in-app history entries. */
  const goLanding = useCallback(() => {
    const depth = history.state?.depth ?? 0
    if (depth > 0) history.go(-depth) // → popstate
    else setCurrentScreen('landing')
  }, [])

  useEffect(() => {
    // After a reload the entry may still point at an inner screen while we render landing.
    if (history.state?.screen) history.replaceState(null, '')

    const onPop = (e) => setCurrentScreen(e.state?.screen ?? 'landing')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Leaving the analysis flow cancels any in-flight scan.
  useEffect(() => {
    if (currentScreen === 'landing' || currentScreen === 'history') {
      abortRef.current?.abort()
      setAnalysis(null)
    }
  }, [currentScreen])

  /* ---------------- scanning ---------------- */

  const startRun = () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    return controller
  }

  const openAnalysis = useCallback(
    (next) => {
      setAnalysis(next)
      // Re-scanning while already on the result (e.g. paste) replaces it instead of stacking.
      const onAnalysis = ['analysis', 'evidence'].includes(history.state?.screen)
      navigate('analysis', { replace: onAnalysis })
    },
    [navigate],
  )

  const handleFile = useCallback(
    async (file) => {
      const validationError = validateImage(file)
      if (validationError) {
        setError(validationError)
        return
      }

      const controller = startRun()
      const key = crypto.randomUUID?.() ?? String(Date.now())
      setError(null)
      openAnalysis({ key, name: file.name, url: URL.createObjectURL(file), status: 'scanning', result: null })

      try {
        const [res, thumbnail] = await Promise.all([
          detectImage(file, { signal: controller.signal }),
          createThumbnail(file),
          delay(MIN_SCAN_MS, controller.signal),
        ])
        if (controller.signal.aborted) return

        setAnalysis((a) => (a?.key === key ? { ...a, status: 'done', result: res } : a))
        addScan({
          id: key,
          name: file.name,
          probability: res.probability,
          confidence: res.confidence ?? null,
          details: res.details ?? null,
          thumbnail,
          scannedAt: Date.now(),
        })
      } catch (err) {
        if (err?.name === 'AbortError') return
        setError(err?.message || 'Gagal menganalisis gambar. Periksa koneksi lalu coba lagi.')
        goLanding()
      }
    },
    [addScan, openAnalysis, goLanding],
  )

  /** Re-opens a saved scan, replaying a short scan animation before the stored result. */
  const handleSelectScan = useCallback(
    async (scan) => {
      const controller = startRun()
      const key = `replay-${scan.id}-${Date.now()}`
      setError(null)
      openAnalysis({
        key,
        name: scan.name,
        url: scan.thumbnail ?? null,
        status: 'scanning',
        result: null,
      })

      try {
        await delay(MIN_SCAN_MS, controller.signal)
        const result = {
          probability: scan.probability,
          isAiGenerated: scan.probability >= 50,
          confidence: scan.confidence ?? undefined,
          // In mock mode, regenerate details so older saved scans get the latest evidence fields.
          details:
            scan.details && !USING_MOCK ? scan.details : deriveDetails(scan.probability),
        }
        setAnalysis((a) => (a?.key === key ? { ...a, status: 'done', result } : a))
      } catch {
        /* aborted */
      }
    },
    [openAnalysis],
  )

  // Paste an image from the clipboard (handy on desktop).
  useEffect(() => {
    const onPaste = (e) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'))
      const file = item?.getAsFile()
      if (file) handleFile(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [handleFile])

  const onInputChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow selecting the same file again
    if (file) handleFile(file)
  }

  /* ---------------- render ---------------- */

  const renderScreen = () => {
    switch (currentScreen) {
      case 'history':
        return (
          <HistoryScreen
            scans={scans}
            onBack={goLanding}
            onNewScan={goLanding}
            onSelectScan={handleSelectScan}
          />
        )

      case 'evidence':
        if (analysis?.status === 'done') {
          return (
            <EvidenceScreen
              key={`${analysis.key}-evidence`}
              scan={analysis}
              onBack={goBack}
              onHome={goLanding}
            />
          )
        }
      // falls through – evidence needs a finished result

      case 'analysis':
        if (analysis) {
          return (
            <AnalysisScreen
              key={analysis.key}
              scan={analysis}
              onBack={goBack}
              onRescan={goLanding}
              onShowEvidence={() => navigate('evidence')}
            />
          )
        }
      // falls through – nothing to show (e.g. after forward-navigating into a stale entry)

      default:
        return (
          <HomeScreen
            error={error}
            scans={scans}
            onFile={handleFile}
            onTakePhoto={() => cameraInputRef.current?.click()}
            onPickGallery={() => galleryInputRef.current?.click()}
            onSelectScan={handleSelectScan}
            onOpenHistory={() => navigate('history')}
          />
        )
    }
  }

  return (
    <>
      {renderScreen()}

      {/* Hidden file inputs. `capture` opens the rear camera on mobile; desktop falls back to a file picker. */}
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
    </>
  )
}
