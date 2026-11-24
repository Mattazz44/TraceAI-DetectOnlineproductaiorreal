/**
 * Reads natural pixel dimensions of an image File without uploading it,
 * and creates a compact aspect-preserving JPEG thumbnail for local history.
 */
export async function inspectImageDimensions(file) {
  try {
    const bitmap = await createImageBitmap(file)
    const dims = { width: bitmap.width, height: bitmap.height }
    bitmap.close?.()
    return dims
  } catch {
    return null
  }
}

export async function createThumbnail(file, maxDim = 800) {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()

    return canvas.toDataURL('image/jpeg', 0.85)
  } catch {
    return null
  }
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function formatMimeShort(mime) {
  if (!mime) return 'GAMBAR'
  const map = {
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'image/webp': 'WEBP',
  }
  return map[mime.toLowerCase()] || mime.replace('image/', '').toUpperCase()
}
