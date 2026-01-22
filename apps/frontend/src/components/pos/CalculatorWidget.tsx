"use client";
import React from 'react';

export default function CalculatorWidget() {
  const [display, setDisplay] = React.useState<string>('');

  const append = (val: string) => setDisplay((d) => (d + val).slice(0, 32));
  const clear = () => setDisplay('');
  const backspace = () => setDisplay((d) => d.slice(0, -1));
  const evaluate = () => {
    try {
      // Simple eval para operaciones: + - * /
      // Nota: controlado, no permite funciones, solo dígitos y operadores básicos
      const safe = display.replace(/[^0-9+\-*/().]/g, '');
      // eslint-disable-next-line no-eval
      const result = eval(safe);
      setDisplay(String(result));
    } catch (_) {
      // Ignorar errores
    }
  };

  const btn = (label: string, onClick: () => void, className = '') => (
    <button onClick={onClick} className={`px-2 py-2 rounded border bg-white hover:bg-slate-50 ${className}`}>{label}</button>
  );

  return (
    <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <div className="text-sm font-medium mb-2">Calculadora</div>
      <input
        aria-label="Pantalla de calculadora"
        value={display}
        onChange={(e) => setDisplay(e.target.value)}
        className="w-full mb-2 px-2 py-1 border rounded bg-white dark:bg-slate-800"
      />
      <div className="grid grid-cols-4 gap-2">
        {btn('7', () => append('7'))}
        {btn('8', () => append('8'))}
        {btn('9', () => append('9'))}
        {btn('⌫', backspace)}
        {btn('4', () => append('4'))}
        {btn('5', () => append('5'))}
        {btn('6', () => append('6'))}
        {btn('+', () => append('+'))}
        {btn('1', () => append('1'))}
        {btn('2', () => append('2'))}
        {btn('3', () => append('3'))}
        {btn('-', () => append('-'))}
        {btn('0', () => append('0'))}
        {btn('.', () => append('.'))}
        {btn('C', clear)}
        {btn('=', evaluate, 'col-span-1')}
      </div>
    </div>
  );
}