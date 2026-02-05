import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StatCellProps {
  success: number;
  total: number;
  errors?: number;
  efficiency?: number; // Pre-calculated or auto-calculate from success/total
  showEfficiency?: boolean;
  compact?: boolean;
  // Custom thresholds per action type
  thresholds?: {
    excellent: number; // >= this = green
    acceptable: number; // >= this = yellow, below = red
  };
  tooltipContent?: React.ReactNode;
}

const DEFAULT_THRESHOLDS = { excellent: 50, acceptable: 25 };

export function StatCell({ 
  success, 
  total, 
  errors,
  efficiency, 
  showEfficiency = true,
  compact = false,
  thresholds = DEFAULT_THRESHOLDS,
  tooltipContent
}: StatCellProps) {
  // Calculate efficiency if not provided
  const eff = efficiency ?? (total > 0 ? (success / total) * 100 : null);
  
  if (total === 0) {
    return <span className="text-muted-foreground">-</span>;
  }
  
  const getEfficiencyColor = (value: number) => {
    if (value >= thresholds.excellent) return 'text-primary';
    if (value >= thresholds.acceptable) return 'text-warning';
    return 'text-destructive';
  };

  const content = (
    <span className={cn("inline-flex items-baseline gap-0.5", compact && "text-xs")}>
      <span className="font-medium">{success}</span>
      <span className="text-muted-foreground">/{total}</span>
      {showEfficiency && eff !== null && (
        <span className={cn(
          "ml-1 text-xs font-medium",
          getEfficiencyColor(eff)
        )}>
          ({eff.toFixed(0)}%)
        </span>
      )}
    </span>
  );

  if (tooltipContent) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

// Preset thresholds for different action types
export const STAT_THRESHOLDS = {
  serve: { excellent: 15, acceptable: 5 }, // Aces are rare
  reception: { excellent: 70, acceptable: 50 }, // High baseline expected
  attack: { excellent: 40, acceptable: 20 }, // Standard efficiency
  block: { excellent: 30, acceptable: 15 }, // Block points are harder
  defense: { excellent: 60, acceptable: 40 }, // Good defense rate
};
