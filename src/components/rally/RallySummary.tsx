import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trophy, Circle } from 'lucide-react';
import { Rally } from '@/types/volleyball';
import { cn } from '@/lib/utils';

interface RallySummaryProps {
  rallyNo: number;
  phases: Rally[];
  homeName: string;
  awayName: string;
  scoreBefore?: { home: number; away: number };
  scoreAfter?: { home: number; away: number };
  hasIssue?: boolean;
  isExpanded?: boolean;
}

export function RallySummary({
  rallyNo,
  phases,
  homeName,
  awayName,
  scoreBefore,
  scoreAfter,
  hasIssue = false,
  isExpanded = false
}: RallySummaryProps) {
  const finalPhase = phases[phases.length - 1];
  const serveSide = phases[0]?.serve_side;
  const winnerSide = finalPhase?.point_won_by;
  const reason = finalPhase?.reason;
  
  const serveSideName = serveSide === 'CASA' ? homeName : awayName;
  const winnerName = winnerSide === 'CASA' ? homeName : awayName;
  
  const isHomeWin = winnerSide === 'CASA';
  
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg transition-all',
      hasIssue ? 'bg-destructive/5 border border-destructive/20' : 'hover:bg-muted/50',
      isExpanded && 'bg-muted/30'
    )}>
      {/* Rally Number */}
      <div className="flex-shrink-0 w-14 text-center">
        <span className="text-xs text-muted-foreground">Rally</span>
        <div className="font-mono font-bold text-lg">{rallyNo}</div>
      </div>
      
      {/* Serve Indicator */}
      <div className="flex-shrink-0 flex items-center gap-1">
        <Circle className={cn(
          'h-3 w-3',
          serveSide === 'CASA' ? 'fill-home text-home' : 'fill-away text-away'
        )} />
        <span className="text-xs text-muted-foreground">{serveSideName.slice(0, 3)}</span>
      </div>
      
      {/* Phases Count */}
      <Badge variant="outline" className="text-[10px] flex-shrink-0">
        {phases.length}F
      </Badge>
      
      {/* Score Progression */}
      {scoreBefore && scoreAfter && (
        <div className="flex items-center gap-1 text-xs font-mono flex-shrink-0">
          <span className="text-muted-foreground">
            {scoreBefore.home}-{scoreBefore.away}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className={cn(
            'font-medium',
            isHomeWin ? 'text-home' : 'text-away'
          )}>
            {scoreAfter.home}-{scoreAfter.away}
          </span>
        </div>
      )}
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Issue Warning */}
      {hasIssue && (
        <Badge variant="destructive" className="text-[10px] gap-1 flex-shrink-0">
          <AlertTriangle className="h-3 w-3" />
          <span className="hidden sm:inline">Dados</span>
        </Badge>
      )}
      
      {/* Winner & Reason */}
      {winnerSide && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Trophy className={cn(
            'h-3.5 w-3.5',
            isHomeWin ? 'text-home' : 'text-away'
          )} />
          <Badge className={cn(
            'text-xs',
            isHomeWin ? 'bg-home text-home-foreground' : 'bg-away text-away-foreground'
          )}>
            {winnerName.slice(0, 3)}
          </Badge>
          {reason && (
            <span className="text-[10px] text-muted-foreground uppercase">{reason}</span>
          )}
        </div>
      )}
    </div>
  );
}
