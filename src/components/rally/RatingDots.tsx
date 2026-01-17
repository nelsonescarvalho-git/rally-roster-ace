import { cn } from '@/lib/utils';

interface RatingDotsProps {
  code: number | null;
  maxDots?: number;
  size?: 'sm' | 'md';
}

const codeLabels: Record<number, string> = {
  0: 'Erro',
  1: 'Fraco',
  2: 'Bom',
  3: 'Excelente'
};

export function RatingDots({ code, maxDots = 4, size = 'sm' }: RatingDotsProps) {
  if (code === null) return null;
  
  const dotSize = size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2';
  
  const getColors = (code: number) => {
    switch (code) {
      case 0: return { active: 'bg-destructive', inactive: 'bg-destructive/20' };
      case 1: return { active: 'bg-warning', inactive: 'bg-warning/20' };
      case 2: return { active: 'bg-primary', inactive: 'bg-primary/20' };
      case 3: return { active: 'bg-success', inactive: 'bg-success/20' };
      default: return { active: 'bg-muted-foreground', inactive: 'bg-muted' };
    }
  };
  
  const colors = getColors(code);
  const filledDots = code === 0 ? 0 : code;
  
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxDots }, (_, i) => (
          <span
            key={i}
            className={cn(
              'rounded-full transition-colors',
              dotSize,
              i < filledDots ? colors.active : colors.inactive
            )}
          />
        ))}
      </div>
      {code === 0 && (
        <span className="text-[10px] text-destructive font-medium">✕</span>
      )}
    </div>
  );
}

export function getRatingLabel(code: number | null): string {
  if (code === null) return '';
  return codeLabels[code] || '';
}
