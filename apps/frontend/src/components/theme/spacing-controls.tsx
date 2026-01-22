 'use client';
 
 import React from 'react';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 
 export interface SpacingConfig {
   xs: string;
   sm: string;
   md: string;
   lg: string;
   xl: string;
 }
 
 export function useSpacingDefaults(): SpacingConfig {
   return {
     xs: '0.5rem',
     sm: '0.75rem',
     md: '1rem',
     lg: '1.25rem',
     xl: '1.5rem'
   };
 }
 
 export interface SpacingControlsProps {
   value: SpacingConfig;
   onChange: (value: SpacingConfig) => void;
 }
 
 export function SpacingControls({ value, onChange }: SpacingControlsProps) {
   const setVal = (key: keyof SpacingConfig, v: string) =>
     onChange({ ...value, [key]: v });
 
   return (
     <div className="grid grid-cols-2 gap-4">
       {Object.entries(value).map(([k, v]) => (
         <div key={k} className="space-y-2">
           <Label>Espaciado {k}</Label>
           <Input value={v} onChange={(e) => setVal(k as any, e.target.value)} />
         </div>
       ))}
     </div>
   );
 }
