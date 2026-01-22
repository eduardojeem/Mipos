/**
 * Reusable OfferCard component
 * Displays special offer information with image, title, description, and validity
 */

'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { formatDate } from '../utils/timeCalculations';

export interface OfferCardProps {
  offer: {
    title: string;
    description: string;
    validUntil: string;
    image: string;
  };
  onClick?: () => void;
}

function OfferCardComponent({ offer, onClick }: OfferCardProps) {
  const { title, description, validUntil, image } = offer;
  const hasValidUntil = validUntil && validUntil.length > 0;

  return (
    <Card
      className={`overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 ${
        onClick ? 'cursor-pointer hover:border-violet-500 dark:hover:border-violet-400' : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="relative aspect-[2/1] bg-muted dark:bg-slate-700">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          loading="lazy"
        />
        
        {/* Overlay gradient for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 dark:from-black/80 to-transparent" />

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="font-bold text-lg mb-1 line-clamp-2 drop-shadow-lg">
            {title}
          </h3>
          <p className="text-sm opacity-90 line-clamp-2 drop-shadow-md">
            {description}
          </p>
        </div>
      </div>

      {hasValidUntil && (
        <CardContent className="p-3 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-slate-400">
            <Calendar className="w-4 h-4" aria-hidden="true" />
            <span>
              Válido hasta: <strong className="text-slate-900 dark:text-slate-100">{formatDate(validUntil)}</strong>
            </span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export const OfferCard = memo(OfferCardComponent);
