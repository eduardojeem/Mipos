'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Keyboard,
  Command,
  Search,
  Plus,
  Save,
  Copy,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  Settings,
  HelpCircle,
  X,
  Zap,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Calculator,
  FileText,
  Home,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface KeyboardShortcut {
  id: string;
  keys: string[];
  description: string;
  category: 'navigation' | 'actions' | 'editing' | 'general';
  action: () => void;
  global?: boolean;
  disabled?: boolean;
}

interface KeyboardShortcutsProps {
  shortcuts?: KeyboardShortcut[];
  className?: string;
  onShortcutExecuted?: (shortcut: KeyboardShortcut) => void;
}

// Default shortcuts for the POS system
const defaultShortcuts: KeyboardShortcut[] = [
  // Navigation
  {
    id: 'goto-dashboard',
    keys: ['Ctrl', 'H'],
    description: 'Ir al Dashboard',
    category: 'navigation',
    action: () => window.location.href = '/dashboard',
    global: true
  },
  {
    id: 'goto-pos',
    keys: ['Ctrl', 'P'],
    description: 'Abrir Punto de Venta',
    category: 'navigation',
    action: () => window.location.href = '/dashboard/pos',
    global: true
  },
  {
    id: 'goto-inventory',
    keys: ['Ctrl', 'I'],
    description: 'Gestionar Inventario',
    category: 'navigation',
    action: () => window.location.href = '/dashboard/products?tab=inventory',
    global: true
  },
  {
    id: 'goto-customers',
    keys: ['Ctrl', 'U'],
    description: 'Gestionar Clientes',
    category: 'navigation',
    action: () => window.location.href = '/dashboard/customers',
    global: true
  },
  {
    id: 'goto-reports',
    keys: ['Ctrl', 'R'],
    description: 'Ver Reportes',
    category: 'navigation',
    action: () => window.location.href = '/dashboard/reports',
    global: true
  },
  {
    id: 'goto-invoicing',
    keys: ['Ctrl', 'F'],
    description: 'Sistema de Facturación',
    category: 'navigation',
    action: () => window.location.href = '/dashboard/invoicing',
    global: true
  },

  // Actions
  {
    id: 'new-sale',
    keys: ['Ctrl', 'N'],
    description: 'Nueva Venta',
    category: 'actions',
    action: () => {
      // In a real app, this would open a new sale modal or navigate
      console.log('Opening new sale');
    },
    global: true
  },
  {
    id: 'search',
    keys: ['Ctrl', 'K'],
    description: 'Búsqueda Global',
    category: 'actions',
    action: () => {
      // Focus search input or open search modal
      const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    },
    global: true
  },
  {
    id: 'quick-calculator',
    keys: ['Ctrl', 'Alt', 'C'],
    description: 'Calculadora Rápida',
    category: 'actions',
    action: () => {
      // Open calculator modal
      console.log('Opening calculator');
    },
    global: true
  },
  {
    id: 'refresh',
    keys: ['F5'],
    description: 'Actualizar Datos',
    category: 'actions',
    action: () => {
      window.location.reload();
    },
    global: true
  },

  // Editing
  {
    id: 'save',
    keys: ['Ctrl', 'S'],
    description: 'Guardar',
    category: 'editing',
    action: () => {
      // Trigger save action
      console.log('Saving...');
    }
  },
  {
    id: 'copy',
    keys: ['Ctrl', 'C'],
    description: 'Copiar',
    category: 'editing',
    action: () => {
      // Handle copy action
      console.log('Copying...');
    }
  },
  {
    id: 'paste',
    keys: ['Ctrl', 'V'],
    description: 'Pegar',
    category: 'editing',
    action: () => {
      // Handle paste action
      console.log('Pasting...');
    }
  },
  {
    id: 'undo',
    keys: ['Ctrl', 'Z'],
    description: 'Deshacer',
    category: 'editing',
    action: () => {
      // Handle undo action
      console.log('Undoing...');
    }
  },
  {
    id: 'redo',
    keys: ['Ctrl', 'Y'],
    description: 'Rehacer',
    category: 'editing',
    action: () => {
      // Handle redo action
      console.log('Redoing...');
    }
  },

  // General
  {
    id: 'help',
    keys: ['F1'],
    description: 'Mostrar Ayuda',
    category: 'general',
    action: () => {
      // Open help modal
      console.log('Opening help');
    },
    global: true
  },
  {
    id: 'settings',
    keys: ['Ctrl', ','],
    description: 'Configuración',
    category: 'general',
    action: () => {
      // Open settings
      console.log('Opening settings');
    },
    global: true
  },
  {
    id: 'shortcuts-help',
    keys: ['Ctrl', '?'],
    description: 'Mostrar Atajos de Teclado',
    category: 'general',
    action: () => {
      // This will be handled by the component itself
    },
    global: true
  }
];

const KeyIcon = ({ keyName }: { keyName: string }) => {
  const iconMap: Record<string, React.ReactNode> = {
    'Ctrl': <Command className="w-3 h-3" />,
    'Alt': <span className="text-xs font-bold">Alt</span>,
    'Shift': <ArrowUp className="w-3 h-3" />,
    'Enter': <span className="text-xs">↵</span>,
    'Escape': <X className="w-3 h-3" />,
    'F1': <span className="text-xs">F1</span>,
    'F5': <span className="text-xs">F5</span>,
    'ArrowUp': <ArrowUp className="w-3 h-3" />,
    'ArrowDown': <ArrowDown className="w-3 h-3" />,
    'ArrowLeft': <ArrowLeft className="w-3 h-3" />,
    'ArrowRight': <ArrowRight className="w-3 h-3" />
  };

  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-medium bg-muted border border-border rounded">
      {iconMap[keyName] || keyName}
    </kbd>
  );
};

const ShortcutItem = ({
  shortcut,
  onExecute
}: {
  shortcut: KeyboardShortcut;
  onExecute: (shortcut: KeyboardShortcut) => void;
}) => {
  const getCategoryIcon = (category: KeyboardShortcut['category']) => {
    const iconMap = {
      navigation: Home,
      actions: Zap,
      editing: Edit,
      general: Settings
    };
    const Icon = iconMap[category];
    return <Icon className="w-4 h-4" />;
  };

  const getCategoryColor = (category: KeyboardShortcut['category']) => {
    const colorMap = {
      navigation: 'text-blue-600 dark:text-blue-400',
      actions: 'text-green-600 dark:text-green-400',
      editing: 'text-purple-600 dark:text-purple-400',
      general: 'text-gray-600 dark:text-gray-400'
    };
    return colorMap[category];
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-muted/50',
        shortcut.disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('p-1 rounded', getCategoryColor(shortcut.category))}>
          {getCategoryIcon(shortcut.category)}
        </div>
        <div>
          <p className="text-sm font-medium">{shortcut.description}</p>
          <p className="text-xs text-muted-foreground capitalize">{shortcut.category}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {shortcut.keys.map((key, index) => (
          <React.Fragment key={`${key}-${index}`}>
            {index > 0 && <span className="text-xs text-muted-foreground mx-1">+</span>}
            <KeyIcon keyName={key} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  shortcuts = defaultShortcuts,
  className,
  onShortcutExecuted
}) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const key = event.key;
    const newPressedKeys = new Set(pressedKeys);

    // Add modifier keys
    if (event.ctrlKey) newPressedKeys.add('Ctrl');
    if (event.altKey) newPressedKeys.add('Alt');
    if (event.shiftKey) newPressedKeys.add('Shift');

    // Add the main key
    if (!['Control', 'Alt', 'Shift'].includes(key)) {
      newPressedKeys.add(key);
    }

    setPressedKeys(newPressedKeys);

    // Check for matching shortcuts
    const matchingShortcut = shortcuts.find(shortcut => {
      if (shortcut.disabled) return false;

      const shortcutKeys = new Set(shortcut.keys);

      // Check if all shortcut keys are pressed
      if (shortcutKeys.size !== newPressedKeys.size) return false;

      for (const shortcutKey of shortcutKeys) {
        if (!newPressedKeys.has(shortcutKey)) return false;
      }

      return true;
    });

    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();

      // Special handling for help shortcut
      if (matchingShortcut.id === 'shortcuts-help') {
        setIsHelpOpen(!isHelpOpen);
      } else {
        matchingShortcut.action();
        onShortcutExecuted?.(matchingShortcut);
      }
    }
  }, [shortcuts, pressedKeys, isHelpOpen, onShortcutExecuted]);

  const handleKeyUp = useCallback(() => {
    setPressedKeys(new Set());
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Filter shortcuts based on search
  const filteredShortcuts = shortcuts.filter(shortcut =>
    shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shortcut.keys.some(key => key.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group shortcuts by category
  const groupedShortcuts = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <div className={cn('relative', className)}>
      {/* Keyboard Shortcuts Help Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsHelpOpen(!isHelpOpen)}
        className="relative p-2"
        title="Atajos de Teclado (Ctrl + ?)"
      >
        <Keyboard className="w-5 h-5" />
      </Button>

      {/* Help Modal */}
      <AnimatePresence>
        {isHelpOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsHelpOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[80vh] bg-background border rounded-lg shadow-lg z-50 overflow-hidden"
            >
              <Card className="border-0 shadow-none h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Keyboard className="w-6 h-6" />
                      Atajos de Teclado
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsHelpOpen(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar atajos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardHeader>

                <Separator />

                <CardContent className="p-0">
                  <div className="max-h-[60vh] overflow-y-auto p-6">
                    {Object.keys(groupedShortcuts).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Keyboard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No se encontraron atajos</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                          <div key={category}>
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="outline" className="capitalize">
                                {category === 'navigation' && 'Navegación'}
                                {category === 'actions' && 'Acciones'}
                                {category === 'editing' && 'Edición'}
                                {category === 'general' && 'General'}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {categoryShortcuts.length} atajos
                              </span>
                            </div>

                            <div className="grid gap-2">
                              {categoryShortcuts.map((shortcut) => (
                                <ShortcutItem
                                  key={shortcut.id}
                                  shortcut={shortcut}
                                  onExecute={(shortcut) => {
                                    shortcut.action();
                                    onShortcutExecuted?.(shortcut);
                                    setIsHelpOpen(false);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>

                {/* Footer */}
                <div className="border-t p-4 bg-muted/30">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span>Total: {shortcuts.length} atajos</span>
                      <span>Activos: {shortcuts.filter(s => !s.disabled).length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Presiona</span>
                      <KeyIcon keyName="Escape" />
                      <span>para cerrar</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Current pressed keys indicator (for development) */}
      {process.env.NODE_ENV === 'development' && pressedKeys.size > 0 && (
        <div className="fixed bottom-4 left-4 bg-background border rounded-lg p-2 shadow-lg z-40">
          <div className="flex items-center gap-2 text-sm">
            <span>Presionado:</span>
            {Array.from(pressedKeys).map((key, index) => (
              <React.Fragment key={`${key}-${index}`}>
                {index > 0 && <span>+</span>}
                <KeyIcon keyName={key} />
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Hook for using keyboard shortcuts
export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  const [activeShortcuts, setActiveShortcuts] = useState(shortcuts);

  const addShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setActiveShortcuts(prev => [...prev, shortcut]);
  }, []);

  const removeShortcut = useCallback((id: string) => {
    setActiveShortcuts(prev => prev.filter(s => s.id !== id));
  }, []);

  const toggleShortcut = useCallback((id: string) => {
    setActiveShortcuts(prev =>
      prev.map(s =>
        s.id === id ? { ...s, disabled: !s.disabled } : s
      )
    );
  }, []);

  return {
    shortcuts: activeShortcuts,
    addShortcut,
    removeShortcut,
    toggleShortcut
  };
};

export default KeyboardShortcuts;