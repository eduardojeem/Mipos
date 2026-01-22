"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { hexToRgba } from '@/lib/color-utils';
import { cn } from '@/lib/utils';

export interface CarouselImage {
  id: string;
  url: string;
  alt?: string;
  link?: string;
}

export interface CarouselProps {
  images: CarouselImage[];
  enabled?: boolean;
  intervalSec?: number;
  ratio?: number;
  autoplay?: boolean;
  transitionMs?: number;
  branding?: {
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string;
    gradientStart?: string;
    gradientEnd?: string;
  };
}

export function Carousel({ 
  images, 
  enabled = true, 
  intervalSec = 5, 
  ratio, 
  autoplay = true, 
  transitionMs = 500, 
  branding 
}: CarouselProps) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const hoverRef = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const primary = branding?.primaryColor || '#ec4899';
  const secondary = branding?.secondaryColor || '#9333ea';
  const gradientStart = branding?.gradientStart || primary;
  const gradientEnd = branding?.gradientEnd || secondary;

  const validInterval = useMemo(() => {
    const t = Number(intervalSec) || 5;
    return Math.min(10, Math.max(3, t));
  }, [intervalSec]);

  const imgs = useMemo(() => {
    const list = Array.isArray(images) ? images.slice(0, 10) : [];
    return list.filter((im) => typeof im?.url === 'string' && im.url.trim().length > 0);
  }, [images]);

  // Ratio más compacto: 21:9 por defecto para un carrusel más bajo
  const safeRatio = useMemo(() => {
    const r = Number(ratio);
    if (!isFinite(r) || r <= 0) return 2.5; // Más ancho y bajo
    return Math.max(r, 1.5); // Mínimo 1.5 para evitar muy alto
  }, [ratio]);

  const blurDataURL = useMemo(() => {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
      <svg xmlns="http://www.w3.org/2000/svg" width="21" height="9" viewBox="0 0 21 9">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${gradientStart}" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="${gradientEnd}" stop-opacity="0.4"/>
          </linearGradient>
        </defs>
        <rect width="21" height="9" fill="url(#g)"/>
      </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }, [gradientStart, gradientEnd]);

  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReduceMotion(mq.matches);
      const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
      mq.addEventListener?.('change', handler);
      return () => mq.removeEventListener?.('change', handler);
    } catch {
      // noop
    }
  }, []);

  const goToSlide = useCallback((newIndex: number) => {
    setIndex(newIndex);
    setProgress(0);
  }, []);

  const goPrev = useCallback(() => {
    goToSlide((index - 1 + imgs.length) % imgs.length);
  }, [index, imgs.length, goToSlide]);

  const goNext = useCallback(() => {
    goToSlide((index + 1) % imgs.length);
  }, [index, imgs.length, goToSlide]);

  // Auto-advance with progress
  useEffect(() => {
    const autoPlayEnabled = enabled && autoplay && !reduceMotion && imgs.length > 1;
    
    if (progressRef.current) clearInterval(progressRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    
    if (!autoPlayEnabled) {
      setProgress(0);
      return;
    }

    const intervalMs = validInterval * 1000;
    const progressStep = 100 / (intervalMs / 30);
    
    progressRef.current = setInterval(() => {
      if (!hoverRef.current) {
        setProgress(prev => Math.min(100, prev + progressStep));
      }
    }, 30);

    timerRef.current = setTimeout(() => {
      if (!hoverRef.current) {
        goNext();
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [enabled, autoplay, reduceMotion, imgs.length, validInterval, index, goNext]);

  // Prefetch next image
  useEffect(() => {
    const nextIndex = (index + 1) % imgs.length;
    const nextUrl = imgs[nextIndex]?.url;
    if (nextUrl) {
      const preload = new window.Image();
      preload.src = nextUrl;
    }
  }, [index, imgs]);

  if (!enabled || imgs.length === 0) return null;

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    }
  };

  return (
    <section className="w-full py-2 sm:py-4">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6">
        <div
          role="region"
          aria-roledescription="Carrusel"
          aria-label="Promociones destacadas"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onMouseEnter={() => { hoverRef.current = true; }}
          onMouseLeave={() => { hoverRef.current = false; }}
          onTouchStart={(e) => {
            const t = e.touches?.[0];
            if (t) {
              touchStartX.current = t.clientX;
              touchDeltaX.current = 0;
              hoverRef.current = true;
            }
          }}
          onTouchMove={(e) => {
            const t = e.touches?.[0];
            if (t && touchStartX.current !== null) {
              touchDeltaX.current = t.clientX - touchStartX.current;
            }
          }}
          onTouchEnd={() => {
            const dx = touchDeltaX.current;
            touchStartX.current = null;
            hoverRef.current = false;
            if (dx > 50) goPrev();
            else if (dx < -50) goNext();
            touchDeltaX.current = 0;
          }}
          className={cn(
            "relative w-full overflow-hidden",
            "rounded-xl sm:rounded-2xl",
            "shadow-lg",
            "bg-slate-900",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          )}
          style={{
            aspectRatio: safeRatio,
            maxHeight: '320px', // Altura máxima para mantenerlo compacto
          }}
        >
          {/* Progress bar */}
          {imgs.length > 1 && autoplay && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/20 z-20">
              <div 
                className="h-full"
                style={{ 
                  background: `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`,
                  width: `${progress}%`,
                  transition: 'width 30ms linear'
                }}
              />
            </div>
          )}

          {/* Slides */}
          {imgs.map((img, i) => (
            <div
              key={img.id}
              className={cn(
                "absolute inset-0",
                !reduceMotion && "transition-opacity duration-500 ease-out"
              )}
              style={{
                opacity: i === index ? 1 : 0,
                zIndex: i === index ? 10 : 0
              }}
            >
              <Image
                src={img.url}
                alt={img.alt || `Promoción ${i + 1}`}
                fill
                priority={i === 0}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1152px"
                className="object-cover"
                placeholder="blur"
                blurDataURL={blurDataURL}
              />
              
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

              {/* Caption - compact */}
              {img.alt && (
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4">
                  <span 
                    className={cn(
                      "inline-block",
                      "bg-black/50 backdrop-blur-sm",
                      "text-white text-xs sm:text-sm font-medium",
                      "px-3 py-1.5 rounded-lg",
                      "max-w-[80%] truncate"
                    )}
                  >
                    {img.alt}
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* Navigation - compact arrows */}
          {imgs.length > 1 && (
            <>
              <button
                aria-label="Anterior"
                onClick={goPrev}
                className={cn(
                  "absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20",
                  "w-8 h-8 sm:w-9 sm:h-9",
                  "rounded-full",
                  "bg-black/40 hover:bg-black/60",
                  "backdrop-blur-sm",
                  "flex items-center justify-center",
                  "transition-all duration-150",
                  "opacity-0 group-hover:opacity-100",
                  "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                )}
                style={{ opacity: 0.7 }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              
              <button
                aria-label="Siguiente"
                onClick={goNext}
                className={cn(
                  "absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20",
                  "w-8 h-8 sm:w-9 sm:h-9",
                  "rounded-full",
                  "bg-black/40 hover:bg-black/60",
                  "backdrop-blur-sm",
                  "flex items-center justify-center",
                  "transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                )}
                style={{ opacity: 0.7 }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            </>
          )}

          {/* Dots - minimal */}
          {imgs.length > 1 && (
            <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 flex items-center gap-1.5 z-20">
              {imgs.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Ir a imagen ${i + 1}`}
                  onClick={() => goToSlide(i)}
                  className={cn(
                    "transition-all duration-200",
                    "rounded-full",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white",
                    i === index 
                      ? "w-4 sm:w-5 h-1.5 bg-white" 
                      : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
