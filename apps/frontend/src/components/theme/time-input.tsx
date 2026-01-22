import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertCircle } from 'lucide-react';
import { themeService } from '@/lib/theme/theme-service';

interface TimeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  className?: string;
}

export function TimeInput({ label, value, onChange, suggestions = [], className = '' }: TimeInputProps) {
  const [error, setError] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  useEffect(() => {
    // Validar el tiempo actual
    if (value) {
      const isValid = themeService.validateThemeOptions({ 
        theme: 'system', 
        scheduleEnabled: true, 
        scheduleStart: value, 
        scheduleEnd: '23:59' 
      }).valid;
      
      if (!isValid && value.length === 5) {
        setError('Formato de hora inválido');
      } else {
        setError('');
      }
    }

    // Actualizar sugerencias
    if (value && value.length >= 2) {
      const allSuggestions = themeService.getTimeSuggestions(value.replace(':', ''));
      const filtered = allSuggestions.filter(s => s.startsWith(value));
      setFilteredSuggestions(filtered.length > 0 ? filtered : allSuggestions);
    } else {
      setFilteredSuggestions([]);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = themeService.formatTimeInput(rawValue);
    onChange(formatted);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    if (value && filteredSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Pequeño delay para permitir clicks en sugerencias
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div className={`relative ${className}`}>
      <Label className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        {label}
      </Label>
      <div className="relative">
        <Input
          type="text"
          placeholder="HH:MM"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          maxLength={5}
          className={error ? 'border-red-500' : ''}
        />
        
        {/* Sugerencias */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-10">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

interface TimeRangeValidatorProps {
  startTime: string;
  endTime: string;
  onValidationChange?: (isValid: boolean, error?: string) => void;
}

export function TimeRangeValidator({ startTime, endTime, onValidationChange }: TimeRangeValidatorProps) {
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (startTime && endTime) {
      // Validar el rango completo
      const validation = themeService.validateThemeOptions({
        theme: 'system',
        scheduleEnabled: true,
        scheduleStart: startTime,
        scheduleEnd: endTime
      });

      if (!validation.valid && validation.errors.length > 0) {
        const timeError = validation.errors.find(e => e.includes('hora'));
        if (timeError) {
          setError(timeError);
          onValidationChange?.(false, timeError);
        }
      } else {
        setError('');
        onValidationChange?.(true);
      }
    }
  }, [startTime, endTime, onValidationChange]);

  if (!error) return null;

  return (
    <Alert variant="destructive" className="mt-2">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}

/**
 * Hook para gestionar la validación de tiempo
 */
export function useTimeValidation() {
  const validateTimeRange = (start: string, end: string): { valid: boolean; error?: string } => {
    const validation = themeService.validateThemeOptions({
      theme: 'system',
      scheduleEnabled: true,
      scheduleStart: start,
      scheduleEnd: end
    });

    if (!validation.valid) {
      const timeError = validation.errors.find(e => e.includes('hora'));
      return { valid: false, error: timeError };
    }

    return { valid: true };
  };

  const formatTime = (time: string): string => {
    return themeService.formatTimeInput(time);
  };

  const getSuggestions = (partial: string): string[] => {
    return themeService.getTimeSuggestions(partial);
  };

  return {
    validateTimeRange,
    formatTime,
    getSuggestions
  };
}