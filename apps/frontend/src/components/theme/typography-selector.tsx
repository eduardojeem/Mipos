 'use client';
 
 import React from 'react';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 
 export interface TypographyConfig {
   fontFamily: string;
   fontSize: {
     xs: string;
     sm: string;
     base: string;
     lg: string;
     xl: string;
     '2xl': string;
   };
   lineHeight: {
     tight: string;
     normal: string;
     relaxed: string;
   };
 }
 
 export function useTypographyDefaults(): TypographyConfig {
   return {
     fontFamily: 'Inter, system-ui, sans-serif',
     fontSize: {
       xs: '0.75rem',
       sm: '0.875rem',
       base: '1rem',
       lg: '1.125rem',
       xl: '1.25rem',
       '2xl': '1.5rem'
     },
     lineHeight: {
       tight: '1.25',
       normal: '1.5',
       relaxed: '1.75'
     }
   };
 }
 
 export interface TypographySelectorProps {
   value: TypographyConfig;
   onChange: (value: TypographyConfig) => void;
 }
 
 export function TypographySelector({ value, onChange }: TypographySelectorProps) {
   const setFont = (key: keyof TypographyConfig['fontSize'], v: string) =>
     onChange({ ...value, fontSize: { ...value.fontSize, [key]: v } });
   const setLine = (key: keyof TypographyConfig['lineHeight'], v: string) =>
     onChange({ ...value, lineHeight: { ...value.lineHeight, [key]: v } });
 
   return (
     <div className="space-y-4">
       <div className="space-y-2">
         <Label>Familia tipográfica</Label>
         <Input
           value={value.fontFamily}
           onChange={(e) => onChange({ ...value, fontFamily: e.target.value })}
         />
       </div>
       <div className="grid grid-cols-2 gap-4">
         {Object.entries(value.fontSize).map(([k, v]) => (
           <div key={k} className="space-y-2">
             <Label>Tamaño {k}</Label>
             <Input value={v} onChange={(e) => setFont(k as any, e.target.value)} />
           </div>
         ))}
       </div>
       <div className="grid grid-cols-3 gap-4">
         {Object.entries(value.lineHeight).map(([k, v]) => (
           <div key={k} className="space-y-2">
             <Label>Interlínea {k}</Label>
             <Input value={v} onChange={(e) => setLine(k as any, e.target.value)} />
           </div>
         ))}
       </div>
     </div>
   );
 }
