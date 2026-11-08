import { useEffect } from 'react'
import { Check, X } from 'lucide-react'

/** Small auto-dismissing toast, shown above the sticky bottom bar. */
export default function Toast({ toast, onDismiss, duration = 2800 }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [toast, onDismiss, duration])

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(10.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-5"
    >
      {toast && (
        <div
          key={toast.id}
          className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-[0_12px_32px_-8px_rgb(20_22_18/0.5)] animate-rise"
        >
          <span
            className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${toast.tone === 'error' ? 'bg-alert' : 'bg-neon'} text-ink`}
          >
            {toast.tone === 'error' ? (
              <X className="size-3.5" strokeWidth={3} aria-hidden="true" />
            ) : (
              <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{toast.title}</p>
            {toast.message && <p className="mt-0.5 text-[13px] text-white/65">{toast.message}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

