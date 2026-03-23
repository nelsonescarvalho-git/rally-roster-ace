import { useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface QualityPadProps {
  selectedCode: number | null;
  onSelect: (code: number) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  labels?: {
    0?: string;
    1?: string;
    2?: string;
    3?: string;
  };
}

const DEFAULT_LABELS = {
  0: 'Erro',
  1: 'Fraca',
  2: 'Boa',
  3: 'Excelente',
};

const QUALITY_CONFIG = [
  { code: 0, emoji: '✗', shortcut: '0' },
  { code: 1, emoji: '−', shortcut: '1' },
  { code: 2, emoji: '+', shortcut: '2' },
  { code: 3, emoji: '⭐', shortcut: '3' },
] as const;

export function QualityPad({
  selectedCode,
  onSelect,
  disabled = false,
  autoFocus = true,
  labels = DEFAULT_LABELS,
}: QualityPadProps) {
  // Keyboard shortcuts for 0-3
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return;
    
    const key = e.key;
    if (['0', '1', '2', '3'].includes(key)) {
      e.preventDefault();
      onSelect(parseInt(key, 10));
    }
  }, [disabled, onSelect]);

  useEffect(() => {
    if (autoFocus) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [autoFocus, handleKeyDown]);

  const getStyles = (code: number, isSelected: boolean) => {
    const base = 'relative flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 cursor-pointer select-none transition-all duration-200 min-h-[64px] px-2 py-2';
    
    if (isSelected) {
      switch (code) {
        case 0: return cn(base, 'bg-destructive text-destructive-foreground border-destructive scale-105 shadow-lg shadow-destructive/30 ring-2 ring-destructive/50 ring-offset-2 ring-offset-background');
        case 1: return cn(base, 'bg-warning text-warning-foreground border-warning scale-105 shadow-lg shadow-warning/30 ring-2 ring-warning/50 ring-offset-2 ring-offset-background');
        case 2: return cn(base, 'bg-primary text-primary-foreground border-primary scale-105 shadow-lg shadow-primary/30 ring-2 ring-primary/50 ring-offset-2 ring-offset-background');
        case 3: return cn(base, 'bg-success text-success-foreground border-success scale-105 shadow-lg shadow-success/30 ring-2 ring-success/50 ring-offset-2 ring-offset-background');
      }
    }
    
    switch (code) {
      case 0: return cn(base, 'bg-destructive/8 text-destructive border-destructive/20 hover:bg-destructive/15 hover:border-destructive/40 hover:scale-[1.02] active:scale-95');
      case 1: return cn(base, 'bg-warning/8 text-warning border-warning/20 hover:bg-warning/15 hover:border-warning/40 hover:scale-[1.02] active:scale-95');
      case 2: return cn(base, 'bg-primary/8 text-primary border-primary/20 hover:bg-primary/15 hover:border-primary/40 hover:scale-[1.02] active:scale-95');
      case 3: return cn(base, 'bg-success/8 text-success border-success/20 hover:bg-success/15 hover:border-success/40 hover:scale-[1.02] active:scale-95');
    }
    
    return base;
  };

  return (
    <div className="flex gap-2 w-full">
      {QUALITY_CONFIG.map(({ code, emoji, shortcut }) => {
        const isSelected = selectedCode === code;
        const label = labels[code as keyof typeof labels] || DEFAULT_LABELS[code as keyof typeof DEFAULT_LABELS];
        
        return (
          <button
            key={code}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(code)}
            className={cn(
              'flex-1',
              getStyles(code, isSelected),
              disabled && 'opacity-40 pointer-events-none',
            )}
          >
            {/* Shortcut hint */}
            <span className="absolute top-0.5 right-1.5 text-[9px] font-mono opacity-40">
              {shortcut}
            </span>
            
            {/* Emoji / symbol */}
            <span className={cn(
              "text-xl font-bold leading-none",
              isSelected && "animate-bounce-once"
            )}>
              {emoji}
            </span>
            
            {/* Label */}
            <span className={cn(
              "text-[11px] font-semibold leading-tight whitespace-nowrap",
              isSelected ? "opacity-100" : "opacity-80"
            )}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
