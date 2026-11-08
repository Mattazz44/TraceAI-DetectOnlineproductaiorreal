import { useState } from 'react'
import { Camera } from 'lucide-react'

/**
 * Drag-and-drop / tap-to-upload area for the home screen.
 * Scanning and results are shown on the analysis screen.
 */
export default function Dropzone({ onFile, onBrowse }) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    if (!isDragging) setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    // ignore leave events fired when moving over child elements
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onBrowse()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onBrowse}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label="Unggah gambar. Taruh gambar di sini atau tekan untuk memilih file."
      className={[
        'flex min-h-64 w-full cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed text-center transition-all duration-200 sm:min-h-72',
        isDragging
          ? 'scale-[1.01] border-neon-strong bg-neon/15'
          : 'border-ink/85 bg-white/40 hover:bg-white/70',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink',
      ].join(' ')}
    >
      <div className="pointer-events-none flex flex-col items-center px-8 py-10">
        <Camera
          className={`mb-5 size-9 text-ink transition-transform ${isDragging ? 'scale-110' : ''}`}
          strokeWidth={2}
          aria-hidden="true"
        />
        <p className="text-base font-semibold text-ink">
          {isDragging ? 'Lepaskan untuk mengunggah' : 'Taruh gambar di sini'}
        </p>
        <p className="mt-2 max-w-72 text-sm leading-relaxed text-muted">
          JPG, PNG, atau WebP. Foto produk, katalog, atau iklan.
        </p>
      </div>
    </div>
  )
}
