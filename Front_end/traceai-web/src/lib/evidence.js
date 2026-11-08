/**
 * Evidence model for the "Bukti temuan" screen.
 *
 * Supports both:
 * 1. The `/api/v1/scan` breakdown from `Backend/main.py`:
 *    details: {
 *      breakdown: {
 *        texture:   { status: 'Janggal' | 'Wajar', description: '...' },
 *        text_logo: { status: 'Janggal' | 'Wajar', description: '...' },
 *        lighting:  { status: 'Wajar' | 'Janggal', description: '...' },
 *        metadata:  { status: 'Kosong' | 'Wajar',  description: '...' },
 *      },
 *      regions: [{ x, y, w, h, finding? }]
 *    }
 * 2. The local mock / seed shorthand keys (`texture_anomaly`, `text_rendering`, etc.).
 */

export const STATUS = {
  janggal: { label: 'Janggal', className: 'bg-amber text-ink' },
  ragu: { label: 'Perlu dicek', className: 'bg-[#ffe066] text-ink' },
  wajar: { label: 'Wajar', className: 'bg-neon text-ink' },
  kosong: { label: 'Kosong', className: 'bg-thumb text-ink' },
}

const STATUS_FROM_BACKEND = {
  janggal: 'janggal',
  'perlu dicek': 'ragu',
  ragu: 'ragu',
  wajar: 'wajar',
  kosong: 'kosong',
}

const FINDINGS = [
  {
    id: 'texture',
    field: 'texture_anomaly',
    breakdownKey: 'texture',
    title: 'Tekstur permukaan',
    tip: 'Perbesar gambar. Foto asli punya butiran halus (noise) yang acak, terutama di area gelap.',
    values: {
      high: ['janggal', 'Terlalu halus dan seragam, tanpa noise kamera yang wajar.'],
      medium: ['ragu', 'Sebagian area tampak terlalu halus. Bandingkan dengan foto lain dari penjual.'],
      low: ['wajar', 'Noise dan detail permukaan terlihat alami.'],
    },
  },
  {
    id: 'text',
    field: 'text_rendering',
    breakdownKey: 'text_logo',
    title: 'Teks dan logo',
    tip: 'Coba baca tulisan pada label. Generator AI sering membuat huruf yang mirip tapi tidak bermakna.',
    values: {
      distorted: ['janggal', 'Huruf pada kemasan terdistorsi dan tidak terbaca.'],
      clear: ['wajar', 'Huruf dan logo terbaca jelas dan konsisten.'],
      none: ['kosong', 'Tidak ada teks atau logo yang bisa diperiksa.'],
    },
  },
  {
    id: 'lighting',
    field: 'lighting_consistency',
    breakdownKey: 'lighting',
    title: 'Cahaya dan bayangan',
    tip: 'Perhatikan bayangan tiap objek. Semuanya harus jatuh ke arah yang sama.',
    values: {
      poor: ['janggal', 'Arah bayangan tidak cocok dengan sumber cahaya.'],
      fair: ['ragu', 'Beberapa bayangan kurang konsisten dengan sumber cahaya.'],
      good: ['wajar', 'Arah bayangan konsisten dengan sumber cahaya.'],
    },
  },
  {
    id: 'metadata',
    field: 'metadata_check',
    breakdownKey: 'metadata',
    title: 'Metadata',
    tip: 'Metadata sering hilang saat gambar dikirim lewat chat atau diunggah ke marketplace, jadi ini bukan bukti tunggal.',
    values: {
      no_camera_data: ['kosong', 'Tidak ada data kamera maupun tanda C2PA.'],
      camera_data_found: ['wajar', 'Data kamera ditemukan pada file.'],
      ai_signature: ['janggal', 'Tanda C2PA menunjukkan gambar dibuat dengan alat AI.'],
    },
  },
]

/** Normalises `result.details` into display-ready findings and regions. */
export function buildEvidence(result) {
  const details = result?.details ?? {}
  const breakdown = details.breakdown

  const findings = FINDINGS.flatMap((f) => {
    if (breakdown && breakdown[f.breakdownKey]) {
      const item = breakdown[f.breakdownKey]
      const rawStatus = String(item.status ?? '').toLowerCase()
      const status = STATUS_FROM_BACKEND[rawStatus] ?? 'ragu'
      return [{ id: f.id, title: f.title, tip: f.tip, status, description: item.description ?? '' }]
    }
    if (details[f.field] != null) {
      const [status, description] = f.values[details[f.field]] ?? ['ragu', String(details[f.field])]
      return [{ id: f.id, title: f.title, tip: f.tip, status, description }]
    }
    return []
  })

  const regions = (Array.isArray(details.regions) ? details.regions : [])
    .filter((r) => [r.x, r.y, r.w, r.h].every(Number.isFinite))
    .map((r, i) => ({ ...r, id: `region-${i}` }))

  return { findings, regions }
}
