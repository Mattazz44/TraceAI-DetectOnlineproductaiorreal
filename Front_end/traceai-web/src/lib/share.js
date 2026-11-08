/**
 * Opens the native share sheet (Web Share API) when available, otherwise
 * copies the text + link to the clipboard.
 *
 * Must be called directly from a user gesture (click handler) — browsers
 * reject navigator.share() without transient user activation.
 *
 * Note: navigator.share is only exposed in secure contexts (HTTPS or localhost).
 *
 * @returns {Promise<'shared' | 'cancelled' | 'copied' | 'failed'>}
 */
export async function shareOrCopy({ title, text, url }) {
  const data = { title, text, url }

  if (typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(data))) {
    try {
      await navigator.share(data)
      return 'shared'
    } catch (err) {
      // User closed the share sheet — not an error.
      if (err?.name === 'AbortError') return 'cancelled'
      // Anything else (NotAllowedError, etc.) → fall back to copying.
    }
  }

  return (await copyText(`${text}\n\n${url}`)) ? 'copied' : 'failed'
}

export async function copyText(value) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    /* fall through to legacy path */
  }

  // Legacy fallback for insecure contexts / older browsers.
  try {
    const el = document.createElement('textarea')
    el.value = value
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    el.remove()
    return ok
  } catch {
    return false
  }
}

