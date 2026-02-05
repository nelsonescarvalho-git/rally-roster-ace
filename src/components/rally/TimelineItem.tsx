import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RatingDots } from './RatingDots';
import { cn } from '@/lib/utils';

interface TimelineItemProps {
  icon: LucideIcon;
  action: string;
  team: string;
  teamColor?: 'home' | 'away';
  playerNumber?: number | null;
  playerName?: string;
  code?: number | null;
  extra?: string;
  isLast?: boolean;
  highlight?: boolean;
  warning?: string;
  /** Indicates partial data (e.g., player without code, code without player) */
  isPartial?: boolean;
  /** Message to display when isPartial is true */
  partialMessage?: string;
}

export function TimelineItem({
  icon: Icon,
  action,
  team,
  teamColor = 'home',
  playerNumber,
  playerName,
  code,
  extra,
  isLast = false,
  highlight = false,
  warning,
  isPartial = false,
  partialMessage
}: TimelineItemProps) {
  const teamColorClass = teamColor === 'home' 
    ? 'bg-home/10 text-home border-home/30' 
    : 'bg-away/10 text-away border-away/30';
  
  return (
    <div className="flex items-start gap-3 relative">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border -translate-x-1/2" />
      )}
      
      {/* Icon */}
      <div className={cn(
        'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center border',
        highlight ? 'bg-success/20 border-success/50' : 'bg-muted border-border'
      )}>
        <Icon className={cn('h-4 w-4', highlight ? 'text-success' : 'text-muted-foreground')} />
      </div>
      
      {/* Content */}
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{action}</span>
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', teamColorClass)}>
            {team}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {playerNumber !== null && playerNumber !== undefined && (
            <span className="text-xs font-mono font-medium">#{playerNumber}</span>
          )}
          {playerName && (
            <span className="text-xs text-muted-foreground truncate">{playerName}</span>
          )}
          {code !== null && code !== undefined && (
            <RatingDots code={code} />
          )}
          {extra && (
            <Badge variant="secondary" className="text-[10px]">{extra}</Badge>
          )}
          {warning && (
            <Badge variant="outline" className="text-[10px] border-warning text-warning">{warning}</Badge>
          )}
          {isPartial && (
            <Badge variant="outline" className="text-[10px] border-warning text-warning">
              ⚠️ {partialMessage || 'Incompleto'}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
