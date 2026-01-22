'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to detect if the user prefers reduced motion
 * Respects the accessibility setting: prefers-reduced-motion
 */
export function usePrefersReducedMotion(): boolean {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

    useEffect(() => {
        // Check if window is available (client-side only)
        if (typeof window === 'undefined') return

        // Check the media query
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

        // Set initial value
        setPrefersReducedMotion(mediaQuery.matches)

        // Listen for changes
        const handleChange = (event: MediaQueryListEvent) => {
            setPrefersReducedMotion(event.matches)
        }

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange)
            return () => mediaQuery.removeEventListener('change', handleChange)
        }
        // Legacy browsers
        else if (mediaQuery.addListener) {
            mediaQuery.addListener(handleChange)
            return () => mediaQuery.removeListener(handleChange)
        }
    }, [])

    return prefersReducedMotion
}
