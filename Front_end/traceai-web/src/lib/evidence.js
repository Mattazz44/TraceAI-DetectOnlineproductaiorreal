export const STATUS = {
  janggal: {
    label: 'Janggal',
    className: 'bg-ai-bg text-ai-fg border border-ai-border',
  },
  ragu: {
    label: 'Perlu Dicek',
    className: 'bg-warn-bg text-warn-fg border border-warn-border',
  },
  wajar: {
    label: 'Wajar',
    className: 'bg-safe-bg text-safe-fg border border-safe-border',
  },
  kosong: {
    label: 'Kosong',
    className: 'bg-subtle text-muted border border-line',
  },
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
    breakdownKey: 'texture',
    title: 'Tekstur permukaan',
    tip: 'Perbesar area berbahan kain, kulit, atau permukaan datar. Foto kamera asli memiliki butiran halus (sensor noise) yang acak, terutama di area bayangan.',
  },
  {
    id: 'text',
    breakdownKey: 'text_logo',
    title: 'Teks dan detail logo',
    tip: 'Perhatikan tulisan kecil pada label kemasan atau jahitan logo. Generator AI kerap menghasilkan huruf yang menyatu atau bentuk simbol yang asimetris.',
  },
  {
    id: 'lighting',
    breakdownKey: 'lighting',
    title: 'Cahaya dan bayangan',
    tip: 'Amati arah jatuh bayangan dan pantulan di permukaan mengilap. Pastikan seluruh pantulan mengarah ke sumber cahaya yang sama.',
  },
  {
    id: 'metadata',
    breakdownKey: 'metadata',
    title: 'Metadata perangkat (EXIF)',
    tip: 'Aplikasi pesan instan seperti WhatsApp dan situs marketplace lazim menghapus EXIF saat kompresi, jadi ketiadaan EXIF bukan bukti tunggal gambar AI.',
  },
]

export function buildEvidence(result) {
  const details = result?.details ?? {}
  const breakdown = details.breakdown

  const findings = FINDINGS.flatMap((f) => {
    if (breakdown && breakdown[f.breakdownKey]) {
      const item = breakdown[f.breakdownKey]
      const rawStatus = String(item.status ?? '').toLowerCase()
      const status = STATUS_FROM_BACKEND[rawStatus] ?? 'ragu'
      return [
        {
          id: f.id,
          title: f.title,
          tip: f.tip,
          status,
          description: item.description ?? '',
        },
      ]
    }
    return []
  })

  const regions = (Array.isArray(details.regions) ? details.regions : [])
    .filter((r) => [r.x, r.y, r.w, r.h].every(Number.isFinite))
    .map((r, i) => ({ ...r, id: `region-${i}` }))

  const heatmap = typeof details.heatmap === 'string' ? details.heatmap : null
  const imageMeta = details.imageMeta ?? null
  const modelInfo = details.modelInfo ?? null

  return { findings, regions, heatmap, imageMeta, modelInfo }
}
