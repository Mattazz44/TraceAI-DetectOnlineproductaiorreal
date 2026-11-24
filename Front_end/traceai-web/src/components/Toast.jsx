import { useEffect } from 'react'
import { AlertCircle, Check, X } from 'lucide-react'

export default function Toast({ toast, onDismiss, duration = 3200 }) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [toast, onDismiss, duration])

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      {toast && (
        <div
          key={toast.id}
          className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-edge bg-card py-2.5 pr-2 pl-3.5 text-ink shadow-card animate-rise"
        >
          <span
            className={[
              'grid size-7 shrink-0 place-items-center rounded-lg border',
              toast.tone === 'error'
                ? 'border-ai-border bg-ai-bg text-ai-fg'
                : 'border-safe-border bg-safe-bg text-safe-fg',
            ].join(' ')}
            aria-hidden="true"
          >
            {toast.tone === 'error' ? (
              <AlertCircle className="size-4" strokeWidth={2.25} />
            ) : (
              <Check className="size-4" strokeWidth={2.5} />
            )}
          </span>

          <div className="min-w-0 flex-1 py-0.5">
            <p className="text-sm font-semibold text-ink">{toast.title}</p>
            {toast.message && <p className="mt-0.5 text-xs leading-relaxed text-muted">{toast.message}</p>}
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Tutup pemberitahuan"
            className="grid size-11 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-subtle hover:text-ink"
          >
            <X className="size-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
