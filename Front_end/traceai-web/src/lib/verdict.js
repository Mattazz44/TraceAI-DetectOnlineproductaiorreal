/** Human-readable interpretation of a detection result. */

export function getVerdict(probability, isAiGenerated, threshold = 12) {
  if (probability >= 75)
    return { text: 'Gambar ini sangat mungkin hasil generator AI.', barClass: 'bg-amber' }

  const flagged =
    typeof isAiGenerated === 'boolean' ? isAiGenerated : probability >= threshold

  if (probability >= 40 && flagged)
    return { text: 'Gambar ini kemungkinan hasil generator AI.', barClass: 'bg-amber' }
  if (flagged)
    return { text: 'Gambar terindikasi sintetis atau manipulasi digital.', barClass: 'bg-[#ffe066]' }
  if (probability >= 5)
    return { text: 'Gambar ini kemungkinan foto produk asli.', barClass: 'bg-neon' }
  return { text: 'Gambar ini sangat mungkin foto produk asli.', barClass: 'bg-neon' }
}

const CONFIDENCE_BAR = {
  tinggi: 90,
  sedang: 56,
  rendah: 26,
}

/**
 * Confidence is 50–100 for a binary classifier (50 = coin flip).
 * Prefers backend `modelConfidence` label when available so bar & label always match.
 */
export function getConfidence(probability, confidence, modelConfidence) {
  if (typeof modelConfidence === 'string' && modelConfidence.trim()) {
    const key = modelConfidence.trim().toLowerCase()
    const strength = CONFIDENCE_BAR[key] ?? 56
    return { strength, level: modelConfidence.trim() }
  }

  const c = confidence ?? Math.max(probability, 100 - probability)
  const strength = Math.round(Math.min(100, Math.max(0, (c - 50) * 2)))
  const level = strength >= 80 ? 'Tinggi' : strength >= 40 ? 'Sedang' : 'Rendah'
  return { strength, level }
}
