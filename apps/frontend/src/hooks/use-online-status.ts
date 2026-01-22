/**
 * Hook para detectar estado de conexión online/offline
 * 
 * @author BeautyPOS Team
 * @date 2025-11-24
 */

'use client'

import { useState, useEffect } from 'react'

/**
 * Hook simple para detectar si el sistema está online o offline
 */
export function useOnlineStatus(): boolean {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    )

    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    return isOnline
}