export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
  const hasTouch = navigator.maxTouchPoints > 1 && !/Windows NT/i.test(ua)
  return isMobileUA || hasTouch
}

export async function shareOrCopy({ title, text, url }) {
  const data = { title, text, url }
  const fullTextToCopy = `${text}\n${url}`

  // Desktop Windows share flyouts often hang without registered targets, so copy directly on desktop.
  if (isMobileDevice() && typeof navigator.share === 'function') {
    try {
      if (!navigator.canShare || navigator.canShare(data)) {
        await navigator.share(data)
        return 'shared'
      }
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
    }
  }

  return (await copyText(fullTextToCopy)) ? 'copied' : 'failed'
}

export async function copyText(value) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    /* fallback below */
  }

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
