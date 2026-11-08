/**
 * Detection service.
 *
 * Talks to the FastAPI backend in Backend/main.py:
 *   POST {VITE_API_BASE_URL}/scan  (multipart/form-data, field "image")
 *
 * Works whether VITE_API_BASE_URL is set to `http://localhost:8000/api/v1`
 * or `http://localhost:8000`. If VITE_API_BASE_URL is empty, a local mock
 * is used so the UI can still be demoed without the backend running.
 */

import { scanProductImage } from './api.js'

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '')

/** True when no backend is configured and results come from the local mock. */
export const USING_MOCK = false

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_FILE_SIZE_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB) || 10

export function validateImage(file) {
  if (!file) return 'Tidak ada file yang dipilih.'
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Format tidak didukung. Gunakan JPG, PNG, atau WebP.'
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `Ukuran file terlalu besar. Maksimal ${MAX_FILE_SIZE_MB} MB.`
  }
  return null
}

/** Resolves after `ms`, rejecting with AbortError if the signal fires first. */
export function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

const CONFIDENCE_MAP = {
  tinggi: 92,
  sedang: 78,
  rendah: 60,
}

/**
 * Converts the `/api/v1/scan` payload from `Backend/main.py` into the
 * normalised result shape used across the front-end screens.
 */
function normaliseBackendData(data) {
  const probability =
    typeof data.ai_probability === 'number'
      ? Math.round(data.ai_probability)
      : Math.round(
          (data.is_ai_generated ? data.confidence_score : 1 - data.confidence_score) * 100,
        )

  let confidence
  if (typeof data.model_confidence === 'string') {
    confidence = CONFIDENCE_MAP[data.model_confidence.toLowerCase()]
  } else if (typeof data.confidence_score === 'number') {
    confidence = Math.round(data.confidence_score * 100)
  }

  // Convert anomalies `[ymin, xmin, ymax, xmax]` (0–1000 scale) into 0–1 regions
  const regions = Array.isArray(data.anomalies)
    ? data.anomalies
        .filter((a) => Array.isArray(a.box) && a.box.length === 4)
        .map((a) => {
          const [ymin, xmin, ymax, xmax] = a.box
          const findingMap = { texture: 'texture', text_logo: 'text', lighting: 'lighting', metadata: 'metadata' }
          return {
            x: xmin / 1000,
            y: ymin / 1000,
            w: (xmax - xmin) / 1000,
            h: (ymax - ymin) / 1000,
            finding: findingMap[a.finding] ?? a.finding ?? 'texture',
          }
        })
    : data.details?.regions ?? []

  const details = data.breakdown
    ? { breakdown: data.breakdown, regions }
    : { ...(data.details ?? deriveDetails(probability)), regions }

  return {
    scanId: data.scan_id,
    probability,
    isAiGenerated: probability >= 50,
    confidence,
    verdictText: data.verdict_text,
    details,
  }
}

/**
 * @param {File} file
 * @returns {Promise<{ probability: number, isAiGenerated: boolean, confidence?: number, verdictText?: string, details?: object }>}
 */
export async function detectImage(file, { signal } = {}) {
  const data = await scanProductImage(file, { signal })
  if (!data) {
    throw new Error('Respons server tidak valid.')
  }
  return normaliseBackendData(data)
}

/**
 * Plausible evidence breakdown for a given probability (see lib/evidence.js
 * for the shape). Used by the mock and for seed scans saved without details.
 */
export function deriveDetails(probability) {
  const regions = []
  if (probability >= 40) regions.push({ x: 0.1, y: 0.18, w: 0.32, h: 0.38, finding: 'texture' })
  if (probability >= 60) regions.push({ x: 0.6, y: 0.55, w: 0.29, h: 0.33, finding: 'text' })

  return {
    texture_anomaly: probability >= 70 ? 'high' : probability >= 40 ? 'medium' : 'low',
    text_rendering: probability >= 60 ? 'distorted' : 'clear',
    lighting_consistency: probability >= 92 ? 'poor' : probability >= 45 && probability < 60 ? 'fair' : 'good',
    metadata_check: probability >= 50 ? 'no_camera_data' : 'camera_data_found',
    regions,
  }
}

/** Development-only mock: deterministic score per file, with simulated latency. */
async function mockDetect(file, signal) {
  await delay(1600, signal)
  let hash = 0
  const key = `${file.name}:${file.size}`
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  const probability = hash % 101
  return {
    probability,
    isAiGenerated: probability >= 50,
    details: deriveDetails(probability),
  }
}
