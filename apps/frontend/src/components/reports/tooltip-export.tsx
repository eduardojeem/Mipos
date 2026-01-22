'use client';

import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TooltipExportProps {
  disabled?: boolean;
  reason?: string;
  children: React.ReactNode;
}

// Tooltip envoltorio para botones de exportación deshabilitados
export const TooltipExport: React.FC<TooltipExportProps> = ({ disabled = false, reason = 'Exportación no disponible', children }) => {
  if (!disabled) return <>{children}</>;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent>
          <p>{reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TooltipExport;