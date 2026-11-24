import { useEffect, useRef } from 'react'

/**
 * Lightweight halftone / dithered matrix canvas backdrop.
 * Renders subtle geometric dots, plus signs, and diagonal crosses in soft slate/blue
 * tones that respond smoothly to mouse movement, touch drag, and a slow ambient wave.
 */
export default function InteractiveBackground({ theme = 'light', paused = false }) {
  const canvasRef = useRef(null)

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

    const pointer = {
      targetX: -9999,
      targetY: -9999,
      x: -9999,
      y: -9999,
      strength: 0,
      targetStrength: 0,
    }

    const isDark = theme === 'dark'
    const baseRgb = isDark ? [126, 166, 201] : [71, 101, 130]
    const activeRgb = isDark ? [96, 165, 250] : [37, 99, 235]

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

      // Smoothly interpolate pointer position and intensity for soft trails.
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

      const t = prefersReduced || paused ? 0 : timeMs * 0.00055
      const radius = width < 768 ? 135 : 175
      const radiusSq = radius * radius

      ctx.lineCap = 'round'

      for (let r = 0; r < rows; r++) {
        const y = offsetY + r * spacing
        for (let c = 0; c < cols; c++) {
          const x = offsetX + c * spacing

          // Slow ambient diagonal wave keeps the surface subtly alive on touchscreens.
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

          const energy = Math.min(1, ambient * 0.52 + prox * 0.92)
          const blend = Math.min(1, prox * 1.15)

          const red = Math.round(baseRgb[0] + (activeRgb[0] - baseRgb[0]) * blend)
          const green = Math.round(baseRgb[1] + (activeRgb[1] - baseRgb[1]) * blend)
          const blue = Math.round(baseRgb[2] + (activeRgb[2] - baseRgb[2]) * blend)

          const minAlpha = isDark ? 0.08 : 0.075
          const maxAlpha = isDark ? 0.34 : 0.28
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
  }, [theme, paused])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 block size-full"
    />
  )
}
