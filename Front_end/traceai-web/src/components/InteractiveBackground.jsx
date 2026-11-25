import { useEffect, useRef } from 'react'

/**
 * Lightweight halftone / dithered matrix canvas backdrop.
 * Smoothly blends palette when switching between Light and Dark themes,
 * and reacts to mouse movement, touch gestures, and a gentle ambient wave.
 */
export default function InteractiveBackground({ theme = 'light', paused = false }) {
  const canvasRef = useRef(null)
  const themeRef = useRef(theme)

  useEffect(() => {
    themeRef.current = theme
  }, [theme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    let prefersReduced = Boolean(motionQuery?.matches)

    let width = 0
    let height = 0
    let spacing = 28
    let cols = 0
    let rows = 0
    let offsetX = 0
    let offsetY = 0
    let rafId = null
    let hidden = document.hidden

    let darkMix = themeRef.current === 'dark' ? 1 : 0

    const pointer = {
      targetX: -9999,
      targetY: -9999,
      x: -9999,
      y: -9999,
      strength: 0,
      targetStrength: 0,
    }

    const lightBase = [71, 85, 105]
    const darkBase = [148, 163, 184]
    const lightActive = [11, 110, 79]
    const darkActive = [52, 211, 153]

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      spacing = width < 768 ? 26 : 28

      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      cols = Math.ceil(width / spacing) + 1
      rows = Math.ceil(height / spacing) + 1
      offsetX = (width - (cols - 1) * spacing) / 2
      offsetY = (height - (rows - 1) * spacing) / 2
    }

    const drawFrame = (timeMs) => {
      ctx.clearRect(0, 0, width, height)

      const targetDark = themeRef.current === 'dark' ? 1 : 0
      darkMix += (targetDark - darkMix) * 0.14

      if (pointer.targetStrength > 0) {
        if (pointer.x < -5000) {
          pointer.x = pointer.targetX
          pointer.y = pointer.targetY
        } else {
          pointer.x += (pointer.targetX - pointer.x) * 0.16
          pointer.y += (pointer.targetY - pointer.y) * 0.16
        }
      }
      pointer.strength += (pointer.targetStrength - pointer.strength) * 0.1

      const baseR = lightBase[0] + (darkBase[0] - lightBase[0]) * darkMix
      const baseG = lightBase[1] + (darkBase[1] - lightBase[1]) * darkMix
      const baseB = lightBase[2] + (darkBase[2] - lightBase[2]) * darkMix

      const actR = lightActive[0] + (darkActive[0] - lightActive[0]) * darkMix
      const actG = lightActive[1] + (darkActive[1] - lightActive[1]) * darkMix
      const actB = lightActive[2] + (darkActive[2] - lightActive[2]) * darkMix

      const t = prefersReduced || paused ? 0 : timeMs * 0.00055
      const radius = width < 768 ? 135 : 175
      const radiusSq = radius * radius

      ctx.lineCap = 'round'

      for (let r = 0; r < rows; r++) {
        const y = offsetY + r * spacing
        for (let c = 0; c < cols; c++) {
          const x = offsetX + c * spacing

          const waveA = Math.sin(c * 0.28 + r * 0.19 + t)
          const waveB = Math.cos(c * 0.14 - r * 0.24 + t * 0.72)
          const ambient = (waveA * 0.55 + waveB * 0.45 + 1) * 0.5

          let prox = 0
          if (pointer.strength > 0.008) {
            const dx = x - pointer.x
            const dy = y - pointer.y
            const distSq = dx * dx + dy * dy
            if (distSq < radiusSq) {
              const norm = 1 - Math.sqrt(distSq) / radius
              prox = norm * norm * pointer.strength
            }
          }

          const energy = Math.min(1, ambient * 0.5 + prox * 0.94)
          const blend = Math.min(1, prox * 1.15)

          const red = Math.round(baseR + (actR - baseR) * blend)
          const green = Math.round(baseG + (actG - baseG) * blend)
          const blue = Math.round(baseB + (actB - baseB) * blend)

          const minAlpha = 0.07 + darkMix * 0.015
          const maxAlpha = 0.27 + darkMix * 0.07
          const alpha = minAlpha + energy * (maxAlpha - minAlpha)
          const color = `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`

          if (energy < 0.34) {
            const dotR = 1.05 + energy * 1.2
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.arc(x, y, dotR, 0, Math.PI * 2)
            ctx.fill()
          } else if (energy < 0.68) {
            const arm = 2.6 + (energy - 0.34) * 3.4
            ctx.strokeStyle = color
            ctx.lineWidth = 1.15
            ctx.beginPath()
            ctx.moveTo(x - arm, y)
            ctx.lineTo(x + arm, y)
            ctx.moveTo(x, y - arm)
            ctx.lineTo(x, y + arm)
            ctx.stroke()
          } else {
            const arm = 3.2 + (energy - 0.68) * 4.4
            ctx.strokeStyle = color
            ctx.lineWidth = 1.35
            ctx.beginPath()
            ctx.moveTo(x - arm, y - arm)
            ctx.lineTo(x + arm, y + arm)
            ctx.moveTo(x + arm, y - arm)
            ctx.lineTo(x - arm, y + arm)
            ctx.stroke()
          }
        }
      }
    }

    const stopLoop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    }

    const tick = (now) => {
      if (hidden || prefersReduced || paused) {
        stopLoop()
        return
      }
      drawFrame(now)
      rafId = requestAnimationFrame(tick)
    }

    const startLoop = () => {
      stopLoop()
      if (prefersReduced || paused) {
        darkMix = themeRef.current === 'dark' ? 1 : 0
        drawFrame(0)
        return
      }
      if (!hidden) {
        rafId = requestAnimationFrame(tick)
      }
    }

    const handleMouseMove = (e) => {
      pointer.targetX = e.clientX
      pointer.targetY = e.clientY
      pointer.targetStrength = 1
    }

    const handleMouseLeave = () => {
      pointer.targetStrength = 0
    }

    const handleTouchMove = (e) => {
      const touch = e.touches?.[0]
      if (!touch) return
      pointer.targetX = touch.clientX
      pointer.targetY = touch.clientY
      pointer.targetStrength = 1
    }

    const handleTouchEnd = () => {
      pointer.targetStrength = 0
    }

    const handleVisibility = () => {
      hidden = document.hidden
      if (hidden) stopLoop()
      else startLoop()
    }

    const handleMotionChange = (e) => {
      prefersReduced = e.matches
      startLoop()
    }

    resize()
    startLoop()

    window.addEventListener('resize', resize, { passive: true })
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('touchstart', handleTouchMove, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true })
    document.addEventListener('visibilitychange', handleVisibility)
    motionQuery?.addEventListener?.('change', handleMotionChange)

    return () => {
      stopLoop()
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('touchstart', handleTouchMove)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchEnd)
      document.removeEventListener('visibilitychange', handleVisibility)
      motionQuery?.removeEventListener?.('change', handleMotionChange)
    }
  }, [paused])

  useEffect(() => {
    // Redraw static frame immediately on theme switch when animation is paused or reduced.
    if (!paused && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const isDark = theme === 'dark'
    const base = isDark ? [148, 163, 184] : [71, 85, 105]
    const w = window.innerWidth
    const h = window.innerHeight
    const spacing = w < 768 ? 26 : 28
    const cols = Math.ceil(w / spacing) + 1
    const rows = Math.ceil(h / spacing) + 1
    const ox = (w - (cols - 1) * spacing) / 2
    const oy = (h - (rows - 1) * spacing) / 2
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = `rgba(${base[0]}, ${base[1]}, ${base[2]}, ${isDark ? 0.14 : 0.12})`
    for (let r = 0; r < rows; r++) {
      const y = oy + r * spacing
      for (let c = 0; c < cols; c++) {
        ctx.beginPath()
        ctx.arc(ox + c * spacing, y, 1.25, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }, [theme, paused])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 block size-full"
    />
  )
}
