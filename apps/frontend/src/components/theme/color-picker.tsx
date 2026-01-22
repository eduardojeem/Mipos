'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface ColorPickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ColorPicker({ label, value, onChange, className }: ColorPickerProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-14 p-1 rounded-md border"
        />
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-40"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

export interface ColorPaletteSelectorProps<T extends Record<string, string> = Record<string, string>> {
  colors: T;
  onColorsChange: (colors: T) => void;
  title?: string;
  description?: string;
  className?: string;
}

export function ColorPaletteSelector<T extends Record<string, string> = Record<string, string>>({
  colors,
  onColorsChange,
  title = 'Paleta de colores',
  description,
  className
}: ColorPaletteSelectorProps<T>) {
  const entries = Object.entries(colors || {});
  const onChangeKey = (key: string, value: string) => {
    const next = { ...(colors as Record<string, string>) };
    next[key] = value;
    onColorsChange(next as T);
  };
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {entries.map(([key, value]) => (
          <ColorPicker
            key={key}
            label={key.charAt(0).toUpperCase() + key.slice(1)}
            value={value || ''}
            onChange={(v) => onChangeKey(key, v)}
          />
        ))}
      </CardContent>
    </Card>
  );
}
