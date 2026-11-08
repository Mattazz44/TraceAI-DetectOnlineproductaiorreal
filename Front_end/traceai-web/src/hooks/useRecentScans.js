import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'traceai:recent-scans'
const MAX_ITEMS = 50

/** Timestamp for `daysAgo` days before today at hh:mm local time. */
function at(daysAgo, hh, mm) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hh, mm, 0, 0)
  return d.getTime()
}

// Demo data shown on first visit so the home and history screens are never empty.
// `details` / `confidence` are omitted so the result screen derives them from the score.
// `icon` picks an illustrative placeholder thumbnail (see ScanThumb).
function seedScans() {
  return [
    { id: 'seed-1', name: 'foto-lampu-01.jpg', probability: 86, icon: 'lamp', thumbnail: null, scannedAt: at(0, 14, 32) },
    { id: 'seed-2', name: 'tas-kulit.png', probability: 9, icon: 'bag', thumbnail: null, scannedAt: at(0, 10, 15) },
    { id: 'seed-3', name: 'sepatu-putih.jpg', probability: 12, icon: 'shoe', thumbnail: null, scannedAt: at(1, 16, 48) },
    { id: 'seed-4', name: 'kursi-katalog.webp', probability: 92, icon: 'chair', thumbnail: null, scannedAt: at(1, 9, 20) },
  ]
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedScans()
    const saved = JSON.parse(raw)
    // Older versions stored demo rows without timestamps — refresh them, keep real scans.
    if (saved.some((s) => s.id?.startsWith('seed-') && !s.scannedAt)) {
      return [...saved.filter((s) => !s.id?.startsWith('seed-')), ...seedScans()]
    }
    return saved
  } catch {
    return seedScans()
  }
}

export function useRecentScans() {
  const [scans, setScans] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scans))
    } catch {
      /* storage full or unavailable — non-critical */
    }
  }, [scans])

  const addScan = useCallback(
    (scan) =>
      setScans((prev) => [scan, ...prev.filter((s) => s.id !== scan.id)].slice(0, MAX_ITEMS)),
    [],
  )

  const clearScans = useCallback(() => setScans([]), [])

  return { scans, addScan, clearScans }
}
