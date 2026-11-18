/** Human-readable interpretation of a detection result. */

export function getVerdict(probability) {
  if (probability >= 75)
    return { text: 'Gambar ini sangat mungkin hasil generator AI.', barClass: 'bg-amber' }
  if (probability >= 40)
    return { text: 'Gambar ini kemungkinan hasil generator AI.', barClass: 'bg-amber' }
  if (probability >= 12)
    return { text: 'Gambar terindikasi sintetis atau manipulasi digital.', barClass: 'bg-[#ffe066]' }
  if (probability >= 5)
    return { text: 'Gambar ini kemungkinan foto produk asli.', barClass: 'bg-neon' }
  return { text: 'Gambar ini sangat mungkin foto produk asli.', barClass: 'bg-neon' }
}

/**
 * Confidence is 50â€“100 for a binary classifier (50 = coin flip).
 * `strength` rescales it to 0â€“100 for the bar; `level` is the label.
 */
export function getConfidence(probability, confidence) {
  const c = confidence ?? Math.max(probability, 100 - probability)
  const strength = Math.round(Math.min(100, Math.max(0, (c - 50) * 2)))
  const level = strength >= 80 ? 'Tinggi' : strength >= 40 ? 'Sedang' : 'Rendah'
  return { strength, level }
}
