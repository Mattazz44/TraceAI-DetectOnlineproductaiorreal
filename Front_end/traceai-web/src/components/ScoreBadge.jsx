/**
 * Probability badge. Colour reflects how likely the image is AI-generated:
 *   ≥ 70                       → amber   (AI tinggi)
 *   40–69 or isAiGenerated     → yellow  (AI sedang / terindikasi sintetis)
 *   < 40 and not isAiGenerated → neon    (AI rendah / asli)
 */
export function getScoreTone(probability, isAiGenerated) {
  if (probability >= 70) return { className: 'bg-amber text-ink', label: 'Kemungkinan buatan AI' }
  if (probability >= 40 || isAiGenerated === true)
    return { className: 'bg-[#ffe066] text-ink', label: 'Terindikasi sintetis' }
  return { className: 'bg-neon text-ink', label: 'Kemungkinan asli' }
}

export default function ScoreBadge({ probability, isAiGenerated, size = 'md' }) {
  const tone = getScoreTone(probability, isAiGenerated)
  const sizing = size === 'lg' ? 'px-3 py-1.5 text-base' : 'px-2.5 py-1 text-sm'

  return (
    <span
      className={`inline-flex min-w-14 shrink-0 items-center justify-center rounded-lg font-bold tabular-nums ${sizing} ${tone.className}`}
      title={`${probability}% — ${tone.label}`}
      aria-label={`${probability} persen kemungkinan buatan AI`}
    >
      {probability}%
    </span>
  )
}
