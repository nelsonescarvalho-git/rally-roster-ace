import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trophy, Circle, GitCompare } from 'lucide-react';
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
  hasBlockInconsistency?: boolean;
  hasPartialData?: boolean;
  isExpanded?: boolean;
  /** Number of actions in rally_actions table */
  actionsCount?: number;
  /** Number of actions detected from legacy rallies table */
  legacyActionsCount?: number;
}

/**
 * Count legacy actions from a Rally record (rallies table flat structure)
 */
export function countLegacyActions(rally: Rally): number {
  let count = 0;
  if (rally.s_player_id || rally.s_code !== null) count++;
  if (rally.r_player_id || rally.r_code !== null) count++;
  if (rally.setter_player_id || rally.pass_destination || rally.pass_code !== null) count++;
  if (rally.a_player_id || rally.a_code !== null) count++;
  if (rally.b1_player_id || rally.b_code !== null) count++;
  if (rally.d_player_id || rally.d_code !== null) count++;
  return count;
}

export function RallySummary({
  rallyNo,
  phases,
  homeName,
  awayName,
  scoreBefore,
  scoreAfter,
  hasIssue = false,
  hasBlockInconsistency = false,
  hasPartialData = false,
  isExpanded = false,
  actionsCount,
  legacyActionsCount
}: RallySummaryProps) {
  const finalPhase = phases[phases.length - 1];
  const serveSide = phases[0]?.serve_side;
  const winnerSide = finalPhase?.point_won_by;
  const reason = finalPhase?.reason;
  
  const serveSideName = serveSide === 'CASA' ? homeName : awayName;
  const winnerName = winnerSide === 'CASA' ? homeName : awayName;
  
  const isHomeWin = winnerSide === 'CASA';
  
  // Check for discrepancy between legacy and rally_actions data
  // Only flag when rally_actions has FEWER than legacy
  // (rally_actions having MORE is normal for long rallies)
  const hasDiscrepancy = actionsCount !== undefined && 
    legacyActionsCount !== undefined && 
    actionsCount < legacyActionsCount;
  
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg transition-all',
      hasIssue ? 'bg-destructive/5 border border-destructive/20' : 
        hasPartialData ? 'bg-warning/5 border border-warning/20' : 
        hasDiscrepancy ? 'bg-orange-500/5 border border-orange-500/20' :
        'hover:bg-muted/50',
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
      
      {/* Discrepancy Warning (legacy vs rally_actions) */}
      {hasDiscrepancy && (
        <Badge variant="outline" className="text-[10px] gap-1 flex-shrink-0 border-orange-500 text-orange-500">
          <GitCompare className="h-3 w-3" />
          <span className="hidden sm:inline">{legacyActionsCount}L/{actionsCount}A</span>
          <span className="sm:hidden">Sync</span>
        </Badge>
      )}
      
      {/* Issue Warning */}
      {hasIssue && (
        <Badge variant="destructive" className="text-[10px] gap-1 flex-shrink-0">
          <AlertTriangle className="h-3 w-3" />
          <span className="hidden sm:inline">Dados</span>
        </Badge>
      )}
      
      {/* Block Inconsistency Warning */}
      {hasBlockInconsistency && !hasIssue && (
        <Badge variant="outline" className="text-[10px] gap-1 flex-shrink-0 border-warning text-warning">
          <AlertTriangle className="h-3 w-3" />
          <span className="hidden sm:inline">b_code</span>
        </Badge>
      )}
      
      {/* Partial Data Warning */}
      {hasPartialData && !hasIssue && !hasBlockInconsistency && (
        <Badge variant="outline" className="text-[10px] gap-1 flex-shrink-0 border-warning text-warning">
          <AlertTriangle className="h-3 w-3" />
          <span className="hidden sm:inline">Parcial</span>
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
