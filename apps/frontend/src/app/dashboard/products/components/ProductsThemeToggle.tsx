'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Palette,
  Sparkles,
  Zap
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export function ProductsThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  
  const currentTheme = theme === 'system' ? systemTheme : theme;
  
  const themes = [
    {
      value: 'light',
      label: 'Modo Claro',
      icon: Sun,
      description: 'Interfaz clara y brillante',
      gradient: 'from-yellow-400 to-orange-500'
    },
    {
      value: 'dark',
      label: 'Modo Oscuro',
      icon: Moon,
      description: 'Interfaz oscura y elegante',
      gradient: 'from-blue-600 to-purple-600'
    },
    {
      value: 'system',
      label: 'Sistema',
      icon: Monitor,
      description: 'Sigue la configuración del sistema',
      gradient: 'from-gray-500 to-gray-700'
    }
  ];
  
  const getCurrentIcon = () => {
    switch (currentTheme) {
      case 'dark':
        return Moon;
      case 'light':
        return Sun;
      default:
        return Monitor;
    }
  };
  
  const CurrentIcon = getCurrentIcon();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="relative overflow-hidden group border-2 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300"
        >
          <div className="flex items-center gap-2">
            <CurrentIcon className="h-4 w-4 transition-transform group-hover:scale-110" />
            <span className="hidden sm:inline font-medium">Tema</span>
            {currentTheme === 'dark' && (
              <Sparkles className="h-3 w-3 text-blue-400 animate-pulse" />
            )}
          </div>
          
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-64 p-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 shadow-xl"
      >
        <DropdownMenuLabel className="flex items-center gap-2 text-base font-semibold">
          <Palette className="h-4 w-4 text-blue-500" />
          Seleccionar Tema
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="my-2" />
        
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          const isActive = theme === themeOption.value;
          
          return (
            <DropdownMenuItem
              key={themeOption.value}
              onClick={() => setTheme(themeOption.value)}
              className={`
                flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200
                hover:bg-gray-100 dark:hover:bg-slate-700
                ${isActive ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700' : ''}
              `}
            >
              <div className={`
                p-2 rounded-lg bg-gradient-to-br ${themeOption.gradient} 
                ${isActive ? 'shadow-lg scale-110' : 'shadow-md'}
                transition-all duration-200
              `}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {themeOption.label}
                  </span>
                  {isActive && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      Activo
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {themeOption.description}
                </p>
              </div>
              
              {isActive && (
                <Zap className="h-4 w-4 text-blue-500 animate-pulse" />
              )}
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator className="my-2" />
        
        <div className="p-2 text-xs text-gray-500 dark:text-gray-400 text-center">
          <div className="flex items-center justify-center gap-1">
            <Sparkles className="h-3 w-3" />
            <span>Modo oscuro mejorado para productos</span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}