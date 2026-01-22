'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useDeviceType } from './responsive-layout';

interface ResponsiveCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  compact?: boolean;
}

export function ResponsiveCard({ 
  title, 
  children, 
  className, 
  icon,
  compact = false 
}: ResponsiveCardProps) {
  const deviceType = useDeviceType();

  return (
    <Card className={cn(
      "transition-all duration-200",
      deviceType === 'mobile' && "shadow-sm",
      deviceType === 'tablet' && "shadow-md hover:shadow-lg",
      deviceType === 'desktop' && "shadow-md hover:shadow-lg hover:scale-[1.02]",
      className
    )}>
      {title && (
        <CardHeader className={cn(
          deviceType === 'mobile' && compact && "pb-2",
          deviceType === 'mobile' && !compact && "pb-4",
          "flex flex-row items-center space-y-0"
        )}>
          {icon && (
            <div className={cn(
              "mr-3",
              deviceType === 'mobile' ? "w-5 h-5" : "w-6 h-6"
            )}>
              {icon}
            </div>
          )}
          <CardTitle className={cn(
            deviceType === 'mobile' ? "text-lg" : "text-xl",
            "flex-1"
          )}>
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(
        deviceType === 'mobile' && compact && "pt-0",
        deviceType === 'mobile' && !compact && "pt-2"
      )}>
        {children}
      </CardContent>
    </Card>
  );
}

interface ResponsiveStatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon?: React.ReactNode;
  className?: string;
}

export function ResponsiveStatsCard({ 
  title, 
  value, 
  change, 
  icon, 
  className 
}: ResponsiveStatsCardProps) {
  const deviceType = useDeviceType();

  const getChangeColor = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase': return 'text-green-600';
      case 'decrease': return 'text-red-600';
      case 'neutral': return 'text-gray-600';
    }
  };

  const getChangeIcon = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase': return '↗';
      case 'decrease': return '↘';
      case 'neutral': return '→';
    }
  };

  return (
    <ResponsiveCard className={className} compact>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={cn(
            "text-muted-foreground font-medium",
            deviceType === 'mobile' ? "text-sm" : "text-base"
          )}>
            {title}
          </p>
          <p className={cn(
            "font-bold",
            deviceType === 'mobile' ? "text-xl" : "text-2xl lg:text-3xl"
          )}>
            {value}
          </p>
          {change && (
            <p className={cn(
              "text-xs font-medium flex items-center mt-1",
              getChangeColor(change.type)
            )}>
              <span className="mr-1">{getChangeIcon(change.type)}</span>
              {Math.abs(change.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className={cn(
            "opacity-60",
            deviceType === 'mobile' ? "w-8 h-8" : "w-10 h-10 lg:w-12 lg:h-12"
          )}>
            {icon}
          </div>
        )}
      </div>
    </ResponsiveCard>
  );
}

interface ResponsiveTableCardProps {
  title: string;
  headers: string[];
  data: Array<Record<string, any>>;
  className?: string;
  maxRows?: number;
}

export function ResponsiveTableCard({ 
  title, 
  headers, 
  data, 
  className,
  maxRows = 5 
}: ResponsiveTableCardProps) {
  const deviceType = useDeviceType();
  const displayData = data.slice(0, maxRows);

  if (deviceType === 'mobile') {
    return (
      <ResponsiveCard title={title} className={className}>
        <div className="space-y-3">
          {displayData.map((row, index) => (
            <div key={index} className="border-b border-gray-100 pb-3 last:border-b-0">
              {headers.map((header, headerIndex) => (
                <div key={headerIndex} className="flex justify-between items-center py-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    {header}:
                  </span>
                  <span className="text-sm font-semibold">
                    {row[header.toLowerCase().replace(' ', '_')] || row[header] || '-'}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </ResponsiveCard>
    );
  }

  return (
    <ResponsiveCard title={title} className={className}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {headers.map((header, index) => (
                <th key={index} className={cn(
                  "text-left font-medium text-muted-foreground pb-2",
                  deviceType === 'tablet' ? "text-sm" : "text-base"
                )}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, index) => (
              <tr key={index} className="border-b last:border-b-0">
                {headers.map((header, headerIndex) => (
                  <td key={headerIndex} className={cn(
                    "py-2 font-medium",
                    deviceType === 'tablet' ? "text-sm" : "text-base"
                  )}>
                    {row[header.toLowerCase().replace(' ', '_')] || row[header] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ResponsiveCard>
  );
}

interface ResponsiveActionCardProps {
  title: string;
  description?: string;
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    icon?: React.ReactNode;
  }>;
  className?: string;
}

export function ResponsiveActionCard({ 
  title, 
  description, 
  actions, 
  className 
}: ResponsiveActionCardProps) {
  const deviceType = useDeviceType();

  return (
    <ResponsiveCard title={title} className={className}>
      {description && (
        <p className={cn(
          "text-muted-foreground mb-4",
          deviceType === 'mobile' ? "text-sm" : "text-base"
        )}>
          {description}
        </p>
      )}
      <div className={cn(
        "flex gap-2",
        deviceType === 'mobile' ? "flex-col" : "flex-row flex-wrap"
      )}>
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
              deviceType === 'mobile' ? "h-10 px-4 py-2" : "h-9 px-3",
              // Variant styles
              action.variant === 'destructive' && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              action.variant === 'outline' && "border border-input hover:bg-accent hover:text-accent-foreground",
              action.variant === 'secondary' && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              action.variant === 'ghost' && "hover:bg-accent hover:text-accent-foreground",
              action.variant === 'link' && "underline-offset-4 hover:underline text-primary",
              (!action.variant || action.variant === 'default') && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {action.icon && (
              <span className={cn(
                action.label ? "mr-2" : "",
                "w-4 h-4"
              )}>
                {action.icon}
              </span>
            )}
            {action.label}
          </button>
        ))}
      </div>
    </ResponsiveCard>
  );
}