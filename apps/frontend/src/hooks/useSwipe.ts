import { useRef, useCallback } from 'react'

export type SwipeHandlers = {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
}

export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 40 }: SwipeHandlers = {}) {
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    startX.current = t.clientX
    startY.current = t.clientY
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const t = e.changedTouches[0]
    if (startX.current == null || startY.current == null) return
    const dx = t.clientX - startX.current
    const dy = t.clientY - startY.current
    // Ignore mostly vertical movements
    if (Math.abs(dy) > Math.abs(dx)) return
    if (dx < -threshold) onSwipeLeft?.()
    if (dx > threshold) onSwipeRight?.()
    startX.current = null
    startY.current = null
  }, [onSwipeLeft, onSwipeRight, threshold])

  return { onTouchStart, onTouchEnd }
}