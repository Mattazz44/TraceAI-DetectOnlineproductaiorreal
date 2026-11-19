/**
 * Detection service.
 *
 * Talks to the FastAPI backend in Backend/main.py:
 *   POST {VITE_API_BASE_URL}/scan  (multipart/form-data, field "image")
 */

import { scanProductImage } from './api.js'

/** True when results come from the local mock rather than Backend/main.py. */
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

const FINDING_MAP = {
  texture: 'texture',
  text_logo: 'text',
  text: 'text',
  lighting: 'lighting',
  metadata: 'metadata',
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n))
}

function parseAnomalyRegion(item) {
  const rawBox = Array.isArray(item?.box)
    ? item.box
    : Array.isArray(item?.bbox)
      ? item.bbox
      : null
  if (!rawBox || rawBox.length !== 4) return null

  const nums = rawBox.map(Number)
  if (!nums.every(Number.isFinite)) return null

  // Support both 0–1000 integer scale and 0–1 normalised floats
  const maxVal = Math.max(...nums)
  const scale = maxVal > 1.0 ? 1000 : 1
  const [ymin, xmin, ymax, xmax] = nums.map((v) => clamp01(v / scale))

  const w = Math.max(0.04, Math.min(1 - xmin, xmax - xmin))
  const h = Math.max(0.04, Math.min(1 - ymin, ymax - ymin))

  return {
    x: xmin,
    y: ymin,
    w,
    h,
    finding: FINDING_MAP[item?.finding] ?? 'texture',
    score: typeof item?.score === 'number' ? item.score : undefined,
  }
}

/**
 * Converts the `/api/v1/scan` payload from `Backend/main.py` into the
 * normalised result shape used across the front-end screens.
 */
function normaliseBackendData(data) {
  const rawProb =
    typeof data.ai_probability === 'number'
      ? data.ai_probability
      : (data.is_ai_generated ? data.confidence_score : 1 - data.confidence_score) * 100
  const probability = Math.min(100, Math.max(0, Math.round(rawProb)))

  const threshold = typeof data.threshold === 'number' ? data.threshold : 50
  const isAiGenerated =
    typeof data.is_ai_generated === 'boolean' ? data.is_ai_generated : rawProb >= threshold

  let confidence
  if (typeof data.model_confidence === 'string') {
    confidence = CONFIDENCE_MAP[data.model_confidence.toLowerCase()]
  } else if (typeof data.confidence_score === 'number') {
    confidence = Math.round(data.confidence_score * 100)
  }

  const regions = Array.isArray(data.anomalies)
    ? data.anomalies.map(parseAnomalyRegion).filter(Boolean)
    : Array.isArray(data.details?.regions)
      ? data.details.regions
      : []

  const heatmap =
    typeof data.heatmap === 'string' && data.heatmap.startsWith('data:image/')
      ? data.heatmap
      : data.details?.heatmap ?? null

  const details = data.breakdown
    ? { breakdown: data.breakdown, regions, heatmap }
    : { ...(data.details ?? deriveDetails(probability)), regions, heatmap }

  return {
    scanId: data.scan_id,
    probability,
    isAiGenerated,
    threshold,
    classification: data.classification ?? null,
    modelConfidence: data.model_confidence ?? null,
    confidence,
    verdictText: data.verdict_text ?? null,
    modelFile: data.model_file ?? null,
    isFallbackModel: data.is_final_model === false,
    modelWarning: data.model_warning ?? null,
    details,
  }
}

/**
 * @param {File} file
 * @returns {Promise<{ probability: number, isAiGenerated: boolean, threshold: number, confidence?: number, modelConfidence?: string, verdictText?: string, details?: object }>}
 */
export async function detectImage(file, { signal } = {}) {
  const data = await scanProductImage(file, { signal })
  if (!data) {
    throw new Error('Respons server tidak valid.')
  }
  return normaliseBackendData(data)
}

/**
 * Plausible evidence breakdown for seed/demo scans saved without details.
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
    heatmap: null,
  }
}
