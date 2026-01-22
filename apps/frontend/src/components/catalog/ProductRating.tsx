'use client';

import React, { useState } from 'react';
import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductRatingProps {
  rating: number;
  reviewCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

export const ProductRating: React.FC<ProductRatingProps> = ({
  rating,
  reviewCount = 0,
  size = 'md',
  showCount = true,
  interactive = false,
  onRatingChange,
  className
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [tempRating, setTempRating] = useState(rating);

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const displayRating = interactive ? (hoverRating || tempRating) : rating;

  const renderStar = (index: number) => {
    const starValue = index + 1;
    const filled = displayRating >= starValue;
    const halfFilled = displayRating >= starValue - 0.5 && displayRating < starValue;

    const handleClick = () => {
      if (interactive && onRatingChange) {
        setTempRating(starValue);
        onRatingChange(starValue);
      }
    };

    const handleMouseEnter = () => {
      if (interactive) {
        setHoverRating(starValue);
      }
    };

    const handleMouseLeave = () => {
      if (interactive) {
        setHoverRating(0);
      }
    };

    return (
      <button
        key={index}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        disabled={!interactive}
        className={cn(
          'relative transition-colors duration-150',
          interactive && 'hover:scale-110 cursor-pointer',
          !interactive && 'cursor-default'
        )}
      >
        {halfFilled ? (
          <div className="relative">
            <Star className={cn(sizeClasses[size], 'text-muted-foreground')} />
            <StarHalf 
              className={cn(
                sizeClasses[size], 
                'absolute inset-0 text-yellow-400 fill-yellow-400'
              )} 
            />
          </div>
        ) : (
          <Star
            className={cn(
              sizeClasses[size],
              filled 
                ? 'text-yellow-400 fill-yellow-400' 
                : 'text-muted-foreground',
              interactive && hoverRating >= starValue && 'text-yellow-500 fill-yellow-500'
            )}
          />
        )}
      </button>
    );
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, index) => renderStar(index))}
      </div>
      
      {showCount && (
        <div className={cn('flex items-center gap-1 ml-2', textSizeClasses[size])}>
          <span className="font-medium text-foreground">
            {rating.toFixed(1)}
          </span>
          {reviewCount > 0 && (
            <span className="text-muted-foreground">
              ({reviewCount.toLocaleString()})
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductRating;