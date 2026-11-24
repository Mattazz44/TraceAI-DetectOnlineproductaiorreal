import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'traceai:recent-scans-v2'
const LEGACY_KEY = 'traceai:recent-scans'
const MAX_ITEMS = 50

function loadScans() {
  try {
    const current = localStorage.getItem(STORAGE_KEY)
    if (current) {
      const parsed = JSON.parse(current)
      return Array.isArray(parsed) ? parsed : []
    }

    // Migrate real user scans from v1 while dropping old synthetic demo rows.
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy)
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => item && !String(item.id || '').startsWith('seed-'))
      }
    }
    return []
  } catch {
    return []
  }
}

export function useRecentScans() {
  const [scans, setScans] = useState(loadScans)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scans))
    } catch {
      /* storage quota full */
    }
  }, [scans])

  const addScan = useCallback((scan) => {
    setScans((prev) => [scan, ...prev.filter((s) => s.id !== scan.id)].slice(0, MAX_ITEMS))
  }, [])

  const removeScan = useCallback((id) => {
    setScans((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const clearScans = useCallback(() => setScans([]), [])

  return { scans, addScan, removeScan, clearScans }
}
