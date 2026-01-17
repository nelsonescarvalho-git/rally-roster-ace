import { cn } from '@/lib/utils';

interface ColoredRatingButtonProps {
  code: number;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ColoredRatingButton({ 
  code, 
  selected, 
  onClick, 
  disabled = false,
  size = 'md'
}: ColoredRatingButtonProps) {
  const sizeClasses = {
    sm: 'h-10 text-base',
    md: 'h-12 text-lg',
    lg: 'h-14 text-xl',
  };

  const getColorClasses = () => {
    if (selected) {
      switch (code) {
        case 0:
          return 'bg-destructive text-destructive-foreground border-destructive shadow-lg shadow-destructive/30';
        case 1:
          return 'bg-warning text-warning-foreground border-warning shadow-lg shadow-warning/30';
        case 2:
          return 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30';
        case 3:
          return 'bg-success text-success-foreground border-success shadow-lg shadow-success/30';
        default:
          return 'bg-primary text-primary-foreground border-primary';
      }
    }
    // Unselected state - show subtle color hint
    switch (code) {
      case 0:
        return 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20 hover:border-destructive/50';
      case 1:
        return 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/20 hover:border-warning/50';
      case 2:
        return 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 hover:border-primary/50';
      case 3:
        return 'bg-success/10 text-success border-success/30 hover:bg-success/20 hover:border-success/50';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getLabel = () => {
    switch (code) {
      case 0:
        return '✕';
      case 1:
        return '−';
      case 2:
        return '+';
      case 3:
        return '★';
      default:
        return code;
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center gap-1 rounded-lg border-2 font-bold transition-all duration-200 active:scale-95',
        sizeClasses[size],
        getColorClasses(),
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className="text-xs opacity-75">{code}</span>
      <span>{getLabel()}</span>
    </button>
  );
}
