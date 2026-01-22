"use client";
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBusinessConfig } from '@/contexts/BusinessConfigContext'
import { memo } from 'react'

interface SidebarHeaderProps {
  collapsed: boolean
  onToggle: () => void
  ariaControls?: string
  showBranding?: boolean
  className?: string
  brandHref?: string
  onBrandClick?: () => void
  preferInitials?: boolean
}

const SidebarHeaderComponent = ({ collapsed, onToggle, ariaControls = 'main-sidebar', showBranding = true, className, brandHref = '/dashboard', onBrandClick, preferInitials = false }: SidebarHeaderProps) => {
  const { config } = useBusinessConfig();
  const businessName = config.businessName || 'BeautyPOS';
  const tagline = config.tagline || 'Sistema de Cosméticos';
  const logo = config.branding?.logo;
  const initials = businessName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
  return (
    <header className={cn('flex items-center justify-between p-3 border-b border-slate-200/50 dark:border-slate-700/50', className)}>
      {!collapsed && showBranding && (
        <Link
          href={brandHref}
          aria-label={`Ir a ${businessName}`}
          title={businessName}
          className="group flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          onClick={() => onBrandClick?.()}
        >
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-blue-500/20 dark:ring-blue-400/20 group-hover:scale-105 transition-transform overflow-hidden">
            {logo ? (
              <img src={logo} alt={businessName} className="w-full h-full object-contain bg-white" />
            ) : preferInitials && initials ? (
              <span className="text-white font-bold text-sm tracking-wide">{initials}</span>
            ) : (
              <ShoppingCart className="w-6 h-6 text-white" aria-hidden="true" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
              {businessName}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{tagline}</p>
          </div>
        </Link>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        aria-label={collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
        aria-controls={ariaControls}
        aria-expanded={!collapsed}
        title={collapsed ? 'Expandir menú' : 'Contraer menú'}
        className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>
    </header>
  )
}

export const SidebarHeader = memo(SidebarHeaderComponent)
