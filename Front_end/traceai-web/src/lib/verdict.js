/**
 * Maps model probability and calibrated threshold into plain-language
 * conclusions and semantic styling tokens.
 */
export function getVerdict(probability, isAiGenerated, threshold = 65) {
  const flagged =
    typeof isAiGenerated === 'boolean' ? isAiGenerated : probability >= threshold
  const highCutoff = Math.min(95, Math.max(80, threshold + 15))

  if (flagged && probability >= highCutoff) {
    return {
      tone: 'ai',
      badge: 'Terdeteksi Buatan AI',
      headline: 'Terdeteksi Kuat Buatan AI',
      text: 'Pola tekstur mikro dan distribusi piksel menunjukkan ciri kuat gambar hasil generator AI.',
      barClass: 'bg-ai-bar',
      pillClass: 'bg-ai-bg text-ai-fg border-ai-border',
    }
  }

  if (flagged) {
    return {
      tone: 'warn',
      badge: 'Indikasi Sintetis',
      headline: 'Terindikasi Buatan AI atau Manipulasi',
      text: 'Skor melewati ambang deteksi. Tinjau area sorotan dan rincian indikator untuk memastikan keaslian produk.',
      barClass: 'bg-warn-bar',
      pillClass: 'bg-warn-bg text-warn-fg border-warn-border',
    }
  }

  if (probability <= threshold * 0.5) {
    return {
      tone: 'safe',
      badge: 'Gambar Asli',
      headline: 'Kemungkinan Besar Gambar Asli',
      text: 'Distribusi butiran sensor, ketajaman tepi, dan struktur pencahayaan selaras dengan foto kamera.',
      barClass: 'bg-safe-bar',
      pillClass: 'bg-safe-bg text-safe-fg border-safe-border',
    }
  }

  return {
    tone: 'safe',
    badge: 'Cenderung Asli',
    headline: 'Kemungkinan Gambar Asli',
    text: 'Skor berada di bawah ambang AI, namun terdapat sedikit jejak kompresi ulang pada gambar.',
    barClass: 'bg-safe-bar',
    pillClass: 'bg-safe-bg text-safe-fg border-safe-border',
  }
}

const CONFIDENCE_STRENGTH = {
  tinggi: 88,
  sedang: 68,
  rendah: 48,
}

export function getConfidence(probability, confidencePercent, modelConfidence, threshold = 65) {
  if (typeof confidencePercent === 'number' && Number.isFinite(confidencePercent)) {
    const clamped = Math.min(100, Math.max(50, Math.round(confidencePercent)))
    const level =
      modelConfidence || (clamped >= 82 ? 'Tinggi' : clamped >= 66 ? 'Sedang' : 'Rendah')
    return { percent: clamped, barWidth: clamped, level }
  }

  if (typeof modelConfidence === 'string' && modelConfidence.trim()) {
    const key = modelConfidence.trim().toLowerCase()
    const pct = CONFIDENCE_STRENGTH[key] ?? 68
    return { percent: pct, barWidth: pct, level: modelConfidence.trim() }
  }

  const span = probability >= threshold ? Math.max(1, 100 - threshold) : Math.max(1, threshold)
  const dist = Math.abs(probability - threshold) / span
  const pct = Math.round(50 + Math.min(1, dist) * 50)
  const level = pct >= 82 ? 'Tinggi' : pct >= 66 ? 'Sedang' : 'Rendah'
  return { percent: pct, barWidth: pct, level }
}
