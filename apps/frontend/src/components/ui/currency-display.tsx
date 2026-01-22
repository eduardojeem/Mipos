"use client";

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';

interface CurrencyDisplayProps {
  value: number;
  currency?: string;
  locale?: string;
  decimals?: number;
  className?: string;
}

/**
 * Hydration-safe currency display component
 * Prevents hydration mismatches by only rendering formatted currency on client
 */
export function CurrencyDisplay({ 
  value, 
  currency = 'USD', 
  locale = 'en-US', 
  decimals,
  className 
}: CurrencyDisplayProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Show fallback during SSR and initial hydration
  if (!mounted) {
    const numValue = Number(value) || 0;
    return (
      <span className={className}>
        ${numValue.toFixed(decimals ?? 2)}
      </span>
    );
  }
  
  // Show properly formatted currency after hydration
  return (
    <span className={className}>
      {formatCurrency(value, currency, locale, decimals)}
    </span>
  );
}

export default CurrencyDisplay;