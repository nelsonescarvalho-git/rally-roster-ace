import { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Minus, Plus, Star } from 'lucide-react';
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
  { code: 0, icon: X, shortcut: '0' },
  { code: 1, icon: Minus, shortcut: '1' },
  { code: 2, icon: Plus, shortcut: '2' },
  { code: 3, icon: Star, shortcut: '3' },
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

  const getQualityClasses = (code: number, isSelected: boolean) => {
    const baseClasses = 'transition-all duration-150 font-semibold';
    
    if (isSelected) {
      switch (code) {
        case 0: return cn(baseClasses, 'bg-destructive text-destructive-foreground ring-2 ring-destructive ring-offset-2 ring-offset-background');
        case 1: return cn(baseClasses, 'bg-warning text-warning-foreground ring-2 ring-warning ring-offset-2 ring-offset-background');
        case 2: return cn(baseClasses, 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background');
        case 3: return cn(baseClasses, 'bg-success text-success-foreground ring-2 ring-success ring-offset-2 ring-offset-background');
      }
    }
    
    switch (code) {
      case 0: return cn(baseClasses, 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20 hover:border-destructive/50');
      case 1: return cn(baseClasses, 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/20 hover:border-warning/50');
      case 2: return cn(baseClasses, 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 hover:border-primary/50');
      case 3: return cn(baseClasses, 'bg-success/10 text-success border-success/30 hover:bg-success/20 hover:border-success/50');
    }
    
    return baseClasses;
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {QUALITY_CONFIG.map(({ code, icon: Icon, shortcut }) => {
        const isSelected = selectedCode === code;
        const label = labels[code as keyof typeof labels] || DEFAULT_LABELS[code as keyof typeof DEFAULT_LABELS];
        
        return (
          <Button
            key={code}
            variant="outline"
            disabled={disabled}
            onClick={() => onSelect(code)}
            className={cn(
              'h-20 flex-col gap-1 border-2 relative',
              getQualityClasses(code, isSelected)
            )}
          >
            {/* Shortcut badge */}
            <span className="absolute top-1.5 left-2 text-[10px] font-mono opacity-50">
              {shortcut}
            </span>
            
            {/* Main content */}
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{code}</span>
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium">{label}</span>
          </Button>
        );
      })}
    </div>
  );
}
