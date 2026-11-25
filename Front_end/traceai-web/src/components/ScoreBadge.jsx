import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { getVerdict } from '../lib/verdict.js'

export default function ScoreBadge({
  probability,
  isAiGenerated,
  threshold = 65,
  size = 'md',
  showLabel = true,
}) {
  const verdict = getVerdict(probability, isAiGenerated, threshold)
  const isSafe = verdict.tone === 'safe'
  const Icon = isSafe ? ShieldCheck : AlertTriangle

  const sizeClasses =
    size === 'lg'
      ? 'px-3 py-1.5 text-sm gap-1.5'
      : 'px-2.5 py-1 text-xs gap-1.5'

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-lg border font-semibold transition-colors duration-300 ${sizeClasses} ${verdict.pillClass}`}
      title={`${verdict.badge} (${probability}% skor AI)`}
      aria-label={`${verdict.badge}, skor AI ${probability} persen`}
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
      {showLabel && <span className="hidden sm:inline">{verdict.badge}</span>}
      <span className="font-mono font-semibold tabular-nums">{probability}%</span>
    </span>
  )
}
