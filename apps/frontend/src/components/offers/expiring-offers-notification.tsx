'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, Clock, AlertTriangle, Timer, Zap, Sparkles, Flame, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useOfferAnalytics } from '@/hooks/use-offer-analytics';
import { motion, AnimatePresence } from 'framer-motion';

export interface ExpiringOffer {
  id: string;
  productName: string;
  promotionName: string;
  endDate: string;
  discountPercent: number;
  hoursRemaining: number;
}

interface ExpiringOffersNotificationProps {
  offers: ExpiringOffer[];
  onViewOffer?: (offerId: string) => void;
  className?: string;
}

export function ExpiringOffersNotification({ 
  offers, 
  onViewOffer, 
  className 
}: ExpiringOffersNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [dismissedOffers, setDismissedOffers] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(4);
  const [isHovered, setIsHovered] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);
  const { toast } = useToast();
  const { trackClick } = useOfferAnalytics();

  const expiringOffers = offers.filter(offer => 
    offer.hoursRemaining <= 24 && !dismissedOffers.has(offer.id)
  );

  // Effect para mostrar el modal cuando hay ofertas (SOLO LA PRIMERA VEZ)
  useEffect(() => {
    if (expiringOffers.length > 0 && !hasBeenShown) {
      console.log('Showing modal for the first time');
      setIsVisible(true);
      setHasBeenShown(true);
      
      // Mostrar notificación toast para ofertas críticas (<4 horas)
      const criticalOffers = expiringOffers.filter(offer => offer.hoursRemaining < 4);
      if (criticalOffers.length > 0) {
        criticalOffers.forEach(offer => {
          toast({
            title: "🚨 Oferta por expirar",
            description: `${offer.productName} - ${offer.discountPercent}% OFF expira en ${offer.hoursRemaining} horas`,
            duration: 8000,
            action: (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onViewOffer?.(offer.id)}
              >
                Ver oferta
              </Button>
            )
          });
        });
      }
    }
    
    // Reset cuando no hay ofertas
    if (expiringOffers.length === 0 && hasBeenShown) {
      console.log('Resetting modal state - no offers');
      setHasBeenShown(false);
      setIsVisible(false);
    }
  }, [expiringOffers.length, hasBeenShown, toast, onViewOffer]);

  // Effect para manejar el timer cuando el modal es visible
  useEffect(() => {
    if (!isVisible || isHovered) return;

    console.log('Starting timers');
    setTimeRemaining(4);
    
    // Auto-hide timer
    const hideTimer = setTimeout(() => {
      console.log('Auto-closing modal after 4 seconds');
      setIsVisible(false);
    }, 4000);

    // Countdown timer
    const countdown = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      console.log('Cleaning up timers');
      clearTimeout(hideTimer);
      clearInterval(countdown);
    };
  }, [isVisible, isHovered]);

  const handleDismiss = useCallback((offerId?: string) => {
    console.log('handleDismiss called with:', offerId);
    
    if (offerId) {
      setDismissedOffers(prev => new Set(prev).add(offerId));
      if (expiringOffers.length === 1) {
        console.log('Closing modal - last offer dismissed');
        setIsVisible(false);
      }
    } else {
      // Cerrar modal completo
      console.log('Closing modal - manual dismiss');
      setIsVisible(false);
    }
  }, [expiringOffers.length]);

  const handleViewOffer = useCallback((offerId: string) => {
    onViewOffer?.(offerId);
    trackClick(offerId, offerId, offerId, expiringOffers.find(o => o.id === offerId)?.discountPercent || 0);
    setIsVisible(false);
  }, [onViewOffer, trackClick, expiringOffers]);

  const getUrgencyColor = (hours: number) => {
    if (hours < 4) return 'from-red-500 via-red-600 to-pink-600';
    if (hours < 12) return 'from-orange-500 via-orange-600 to-red-500';
    return 'from-amber-500 via-yellow-500 to-orange-500';
  };

  const getUrgencyBgColor = (hours: number) => {
    if (hours < 4) return 'from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20';
    if (hours < 12) return 'from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20';
    return 'from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20';
  };

  const getUrgencyIcon = (hours: number) => {
    if (hours < 4) return <Flame className="w-5 h-5" />;
    if (hours < 12) return <Zap className="w-5 h-5" />;
    return <Timer className="w-5 h-5" />;
  };

  const getUrgencyText = (hours: number) => {
    if (hours < 4) return '¡CRÍTICO!';
    if (hours < 12) return '¡URGENTE!';
    return 'Expira pronto';
  };

  return (
    <AnimatePresence>
      {isVisible && expiringOffers.length > 0 && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
            onClick={() => handleDismiss()}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50, rotateX: -15 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50, rotateX: 15 }}
              transition={{ 
                type: "spring", 
                duration: 0.6,
                bounce: 0.3
              }}
              className="w-full max-w-lg"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden relative">
              {/* Sparkles decoration */}
              <div className="absolute top-4 right-4 text-yellow-400 animate-pulse">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="absolute top-8 right-12 text-yellow-300 animate-pulse delay-300">
                <Sparkles className="w-4 h-4" />
              </div>
              
              {/* Header con gradiente mejorado */}
              <div className="relative bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 p-6 text-white overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
                
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <motion.div 
                      className="p-3 bg-white/20 rounded-full backdrop-blur-sm"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <Flame className="w-7 h-7" />
                    </motion.div>
                    <div>
                      <motion.h2 
                        className="text-2xl font-bold"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        ¡Ofertas por expirar!
                      </motion.h2>
                      <motion.p 
                        className="text-white/90 text-sm font-medium"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        No te pierdas estas oportunidades únicas
                      </motion.p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Countdown timer */}
                    {!isHovered && (
                      <motion.div 
                        className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-bold"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        {timeRemaining}s
                      </motion.div>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismiss()}
                      className="h-9 w-9 p-0 text-white hover:bg-white/20 rounded-full backdrop-blur-sm"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  {expiringOffers.slice(0, 3).map((offer, index) => (
                    <motion.div
                      key={offer.id}
                      initial={{ opacity: 0, x: -30, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ 
                        delay: index * 0.15,
                        type: "spring",
                        bounce: 0.4
                      }}
                      className={`group relative bg-gradient-to-br ${getUrgencyBgColor(offer.hoursRemaining)} rounded-2xl p-5 border-2 border-transparent hover:border-gradient-to-r hover:shadow-xl transition-all duration-500 cursor-pointer overflow-hidden`}
                      onClick={() => handleViewOffer(offer.id)}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Animated background pattern */}
                      <div className="absolute inset-0 opacity-5">
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000" />
                      </div>
                      
                      {/* Urgency indicator */}
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <motion.div 
                          className={`w-3 h-3 rounded-full bg-gradient-to-r ${getUrgencyColor(offer.hoursRemaining)}`}
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <span className={`text-xs font-bold bg-gradient-to-r ${getUrgencyColor(offer.hoursRemaining)} bg-clip-text text-transparent`}>
                          {getUrgencyText(offer.hoursRemaining)}
                        </span>
                      </div>
                      
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0 pr-4">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 truncate group-hover:text-purple-600 transition-colors duration-300">
                              {offer.productName}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
                              {offer.promotionName}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              className="relative"
                            >
                              <Badge className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white font-bold text-lg px-4 py-2 shadow-lg">
                                -{offer.discountPercent}% OFF
                              </Badge>
                              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full blur-lg opacity-30 animate-pulse" />
                            </motion.div>
                            
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${getUrgencyColor(offer.hoursRemaining)} text-white font-bold text-sm shadow-md`}>
                              {getUrgencyIcon(offer.hoursRemaining)}
                              <span>{offer.hoursRemaining}h</span>
                            </div>
                          </div>
                          
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-sm">Ver</span>
                          </motion.div>
                        </div>
                      </div>
                      
                      {/* Enhanced hover effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-pink-500/0 to-red-500/0 group-hover:from-purple-500/10 group-hover:via-pink-500/5 group-hover:to-red-500/10 rounded-2xl transition-all duration-500" />
                    </motion.div>
                  ))}
                  
                  {expiringOffers.length > 3 && (
                    <motion.div 
                      className="text-center py-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full px-4 py-2 inline-block">
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          +{expiringOffers.length - 3} ofertas más por expirar
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Footer mejorado */}
              <div className="bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    >
                      <Clock className="w-4 h-4 text-gray-500" />
                    </motion.div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {isHovered ? 'Pausado - Mueve el cursor para continuar' : `Se cierra en ${timeRemaining}s`}
                    </p>
                  </div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDismiss()}
                      className="text-xs font-semibold bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 hover:border-purple-300 transition-all duration-300"
                    >
                      Cerrar
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}