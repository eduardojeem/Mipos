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

  const safeRatio = useMemo(() => {
    const r = Number(ratio);
    if (!isFinite(r) || r <= 0) return 2.5;
    return Math.max(r, 1.5);
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
    <section className="w-full relative">
      {/* Full-width container - sin max-width para aprovechar toda la pantalla */}
      <div className="w-full">
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
            "relative w-full overflow-hidden group",
            "shadow-2xl",
            "bg-slate-900"
          )}
          style={{
            // Mejor aspect ratio para aprovechar pantalla - 60% de viewport height
            aspectRatio: 'auto',
            height: 'calc(60vh)',
            minHeight: '400px',
            maxHeight: '600px',
          }}
        >
          {/* Premium gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none z-10" />

          {/* Progress bar - más visible y premium */}
          {imgs.length > 1 && autoplay && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-black/30 backdrop-blur-sm z-30">
              <div
                className="h-full shadow-lg"
                style={{
                  background: `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`,
                  width: `${progress}%`,
                  transition: 'width 30ms linear',
                  boxShadow: `0 0 10px ${gradientEnd}`
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
                !reduceMotion && "transition-opacity duration-700 ease-in-out"
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
                sizes="100vw"
                className="object-cover"
                placeholder="blur"
                blurDataURL={blurDataURL}
              />

              {/* Enhanced gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

              {/* Caption - más grande y visible */}
              {img.alt && (
                <div className="absolute bottom-6 left-6 right-6 sm:bottom-12 sm:left-12 sm:right-12 z-20">
                  <div className="glass-card px-6 py-4 sm:px-8 sm:py-5 max-w-2xl rounded-2xl">
                    <h3 className="text-white text-lg sm:text-2xl lg:text-3xl font-bold mb-2 text-shadow-lg">
                      {img.alt}
                    </h3>
                    <div className="w-20 h-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Navigation arrows - más grandes y visibles */}
          {imgs.length > 1 && (
            <>
              <button
                aria-label="Anterior"
                onClick={goPrev}
                className={cn(
                  "absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-30",
                  "w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16",
                  "rounded-full",
                  "glass-card",
                  "flex items-center justify-center",
                  "transition-all duration-300",
                  "opacity-60 hover:opacity-100 group-hover:opacity-100",
                  "hover:scale-110 active:scale-95",
                  "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                )}
              >
                <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
              </button>

              <button
                aria-label="Siguiente"
                onClick={goNext}
                className={cn(
                  "absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30",
                  "w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16",
                  "rounded-full",
                  "glass-card",
                  "flex items-center justify-center",
                  "transition-all duration-300",
                  "opacity-60 hover:opacity-100 group-hover:opacity-100",
                  "hover:scale-110 active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                )}
              >
                <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
              </button>
            </>
          )}

          {/* Dots - más grandes y con estilo premium */}
          {imgs.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3 z-30">
              {imgs.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Ir a imagen ${i + 1}`}
                  onClick={() => goToSlide(i)}
                  className={cn(
                    "transition-all duration-300",
                    "rounded-full",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-lg",
                    i === index
                      ? "w-8 sm:w-12 h-2 sm:h-2.5 bg-gradient-to-r from-purple-500 to-pink-500"
                      : "w-2 sm:w-2.5 h-2 sm:h-2.5 bg-white/50 hover:bg-white/80 hover:scale-125"
                  )}
                />
              ))}
            </div>
          )}

          {/* Slide counter - nuevo elemento informativo */}
          {imgs.length > 1 && (
            <div className="absolute top-6 right-6 z-30 glass-card px-3 py-1.5 rounded-full">
              <span className="text-white text-xs sm:text-sm font-semibold">
                {index + 1} / {imgs.length}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
