'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AnimatedMobileCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * AnimatedMobileCartDrawer - Drawer animado para el carrito en móvil
 * 
 * Características:
 * - Animación suave de entrada/salida
 * - Backdrop con fade
 * - Soporte para gestos de arrastre
 * - Animación de spring natural
 */
export function AnimatedMobileCartDrawer({
  isOpen,
  onClose,
  children,
}: AnimatedMobileCartDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              // Cerrar si se arrastra más de 100px o con velocidad alta
              if (offset.x > 100 || velocity.x > 500) {
                onClose();
              }
            }}
            className={cn(
              'fixed right-0 top-0 bottom-0 z-50',
              'w-full max-w-md',
              'bg-background shadow-xl',
              'flex flex-col'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Carrito</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="min-h-[44px] min-w-[44px]"
                aria-label="Cerrar carrito"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
