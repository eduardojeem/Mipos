'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

interface AdminSidebarContextType {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
  toggle: () => void
}

const AdminSidebarContext = createContext<AdminSidebarContextType | undefined>(undefined)

const STORAGE_KEY = 'admin-sidebar-collapsed'

export function AdminSidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load initial state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setIsCollapsed(stored === 'true')
    }
  }, [])

  // Save state to localStorage
  const handleSetCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsed(collapsed)
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [])

  const toggle = useCallback(() => {
    handleSetCollapsed(!isCollapsed)
  }, [isCollapsed, handleSetCollapsed])

  return (
    <AdminSidebarContext.Provider value={{ isCollapsed, setIsCollapsed: handleSetCollapsed, toggle }}>
      {children}
    </AdminSidebarContext.Provider>
  )
}

export function useAdminSidebar() {
  const context = useContext(AdminSidebarContext)
  if (context === undefined) {
    throw new Error('useAdminSidebar must be used within an AdminSidebarProvider')
  }
  return context
}
