'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { themeService, type ThemeOptions } from '@/lib/theme/theme-service';
import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<ThemeOptions | null>(null);

  useEffect(() => {
    // Cargar configuración actual del servicio
    const stored = themeService.getStoredThemeOptions();
    if (stored) {
      setCurrentTheme(stored);
    }
  }, []);

  const persist = async (next: 'light' | 'dark' | 'system') => {
    try {
      // Actualizar el tema en el provider local
      setTheme(next);
      
      // Crear opciones actualizadas
      const updatedOptions: ThemeOptions = {
        ...(currentTheme || {}),
        theme: next
      };
      
      // Validar y aplicar
      const validation = themeService.validateThemeOptions(updatedOptions);
      if (validation.valid) {
        themeService.applyThemeOptions(updatedOptions);
        await themeService.persistThemeOptions(updatedOptions);
        setCurrentTheme(updatedOptions);
      }
    } catch (error) {
      console.error('Error al cambiar el tema:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-9 w-9 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Cambiar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuItem 
          onClick={() => { setTheme('light'); persist('light'); }}
          className="cursor-pointer"
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Claro</span>
          {theme === 'light' && (
            <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => { setTheme('dark'); persist('dark'); }}
          className="cursor-pointer"
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Oscuro</span>
          {theme === 'dark' && (
            <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => { setTheme('system'); persist('system'); }}
          className="cursor-pointer"
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>Sistema</span>
          {theme === 'system' && (
            <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Versión simple del toggle (solo claro/oscuro)
export function SimpleThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<ThemeOptions | null>(null);

  useEffect(() => {
    const stored = themeService.getStoredThemeOptions();
    if (stored) {
      setCurrentTheme(stored);
    }
  }, []);

  const handleToggle = async () => {
    try {
      const next = theme === 'light' ? 'dark' : 'light';
      setTheme(next);
      
      const updatedOptions: ThemeOptions = {
        ...(currentTheme || {}),
        theme: next
      };
      
      const validation = themeService.validateThemeOptions(updatedOptions);
      if (validation.valid) {
        themeService.applyThemeOptions(updatedOptions);
        await themeService.persistThemeOptions(updatedOptions);
        setCurrentTheme(updatedOptions);
      }
    } catch (error) {
      console.error('Error al cambiar el tema:', error);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className="h-9 w-9 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Cambiar tema</span>
    </Button>
  );
}