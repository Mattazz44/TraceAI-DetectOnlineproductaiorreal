import { scanProductImage } from './api.js'

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_FILE_SIZE_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB) || 10

export function validateImage(file) {
  if (!file) return 'Pilih satu file gambar terlebih dahulu.'
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Format file belum didukung. Gunakan gambar berformat JPG, PNG, atau WebP.'
  }
  if (file.size === 0) {
    return 'File gambar kosong (0 byte). Pilih file gambar yang utuh.'
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `Ukuran file melebihi batas maksimal ${MAX_FILE_SIZE_MB} MB.`
  }
  return null
}

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
  tinggi: 90,
  sedang: 74,
  rendah: 58,
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

export function normaliseBackendData(data) {
  const rawProb =
    typeof data.ai_probability === 'number'
      ? data.ai_probability
      : (data.is_ai_generated ? data.confidence_score : 1 - data.confidence_score) * 100

  const probability = Math.min(100, Math.max(0, Math.round(rawProb)))
  const exactAiProb = Math.min(100, Math.max(0, Number(rawProb.toFixed(1))))
  const exactNonAiProb =
    typeof data.non_ai_probability === 'number'
      ? Number(data.non_ai_probability.toFixed(1))
      : Number((100 - exactAiProb).toFixed(1))

  const threshold = typeof data.threshold === 'number' ? data.threshold : 65
  const isAiGenerated =
    typeof data.is_ai_generated === 'boolean' ? data.is_ai_generated : rawProb >= threshold

  let confidencePercent =
    typeof data.confidence_percent === 'number' ? Math.round(data.confidence_percent) : undefined
  if (confidencePercent === undefined && typeof data.model_confidence === 'string') {
    confidencePercent = CONFIDENCE_MAP[data.model_confidence.toLowerCase()]
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

  const details = {
    breakdown: data.breakdown ?? data.details?.breakdown ?? null,
    regions,
    heatmap,
    imageMeta: data.image_meta ?? data.details?.imageMeta ?? null,
    modelInfo: data.model_info ?? data.details?.modelInfo ?? null,
  }

  return {
    scanId: data.scan_id ?? null,
    timestamp: data.timestamp ?? null,
    probability,
    exactAiProb,
    exactNonAiProb,
    isAiGenerated,
    threshold,
    classification: data.classification ?? null,
    modelConfidence: data.model_confidence ?? null,
    confidencePercent,
    verdictText: data.verdict_text ?? null,
    modelFile: data.model_file ?? null,
    isFallbackModel: data.is_final_model === false,
    modelWarning: data.model_warning ?? null,
    details,
  }
}

export async function detectImage(file, { signal } = {}) {
  const data = await scanProductImage(file, { signal })
  if (!data) {
    throw new Error('Respons server kosong atau tidak sesuai format.')
  }
  return normaliseBackendData(data)
}
