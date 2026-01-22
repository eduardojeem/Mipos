import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text = 'Cargando...',
  className
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center space-y-3 text-muted-foreground',
      className
    )}>
      <div className="relative">
        <Loader2 className={cn(
          'animate-spin text-primary',
          sizeClasses[size]
        )} />
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" />
      </div>
      {text && (
        <p className={cn(
          'font-medium animate-pulse',
          textSizeClasses[size]
        )}>
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;