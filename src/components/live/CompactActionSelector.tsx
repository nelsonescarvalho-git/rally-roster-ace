import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Target, Swords, Square, ShieldCheck, Shield, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RallyActionType, Side, RallyAction } from '@/types/volleyball';

interface CompactActionSelectorProps {
  actions: RallyAction[];
  serveSide: Side;
  recvSide: Side;
  homeName: string;
  awayName: string;
  onSelectAction: (type: RallyActionType, side: Side) => void;
  /** Whether reception is incomplete and should be shown as an option */
  showReceptionOption?: boolean;
  /** Callback for combo D+A flow */
  onSelectCombo?: (side: Side) => void;
}

const ACTION_OPTIONS = [
  { type: 'setter' as RallyActionType, label: 'D', fullLabel: 'Dist', icon: Target },
  { type: 'attack' as RallyActionType, label: 'A', fullLabel: 'Atq', icon: Swords },
  { type: 'block' as RallyActionType, label: 'B', fullLabel: 'Bloco', icon: Square },
  { type: 'defense' as RallyActionType, label: 'Df', fullLabel: 'Def', icon: ShieldCheck },
];

export function CompactActionSelector({
  actions,
  serveSide,
  recvSide,
  homeName,
  awayName,
  onSelectAction,
  showReceptionOption = false,
  onSelectCombo,
}: CompactActionSelectorProps) {
  // Calculate inferred side based on last action
  const inferredSide = useMemo(() => {
    const lastAction = actions[actions.length - 1];
    
    if (!lastAction) {
      return recvSide;
    }
    
    if (lastAction.type === 'attack') {
      return lastAction.side === 'CASA' ? 'FORA' : 'CASA';
    }
    if (lastAction.type === 'defense' || lastAction.type === 'block') {
      return lastAction.side;
    }
    if (lastAction.type === 'setter') {
      return lastAction.side;
    }
    
    return recvSide;
  }, [actions, recvSide]);

  const [selectedSide, setSelectedSide] = useState<Side>(inferredSide);

  useEffect(() => {
    setSelectedSide(inferredSide);
  }, [inferredSide]);

  return (
    <div className="bg-muted/40 border rounded-lg p-2">
      <div className="flex items-center gap-2">
        {/* Reception edit button (optional) */}
        {showReceptionOption && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-2 gap-1 border-success text-success hover:bg-success/10"
              onClick={() => onSelectAction('reception', recvSide)}
            >
              <Shield className="h-4 w-4" />
              <span className="text-xs">Rec</span>
            </Button>
            <div className="w-px h-6 bg-border" />
          </>
        )}

        {/* Action buttons - compact inline */}
        <div className="flex gap-1">
          {ACTION_OPTIONS.map((option) => {
            const Icon = option.icon;
            
            return (
              <Button
                key={option.type}
                variant="outline"
                size="sm"
                className={cn(
                  'h-9 w-12 flex-col gap-0 p-0 transition-all',
                  selectedSide === 'CASA' 
                    ? 'border-home/40 text-home hover:bg-home/10 hover:border-home' 
                    : 'border-away/40 text-away hover:bg-away/10 hover:border-away'
                )}
                onClick={() => onSelectAction(option.type, selectedSide)}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[9px] font-medium">{option.fullLabel}</span>
              </Button>
            );
          })}
        </div>

        {/* Combo D+A button */}
        {onSelectCombo && (
          <>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-9 px-2 gap-1 transition-all',
                'bg-gradient-to-r from-purple-500/10 to-red-500/10',
                'border-purple-500/40 hover:border-purple-500',
                'text-purple-600 hover:text-purple-700'
              )}
              onClick={() => onSelectCombo(selectedSide)}
            >
              <Target className="h-3 w-3" />
              <ArrowRight className="h-3 w-3" />
              <Swords className="h-3 w-3" />
            </Button>
          </>
        )}

        {/* Separator */}
        <div className="w-px h-6 bg-border" />

        {/* Team toggle - compact */}
        <div className="flex gap-1">
          <Button
            variant={selectedSide === 'CASA' ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-9 px-3 text-xs font-semibold transition-all',
              selectedSide === 'CASA' 
                ? 'bg-home text-white hover:bg-home/90' 
                : 'border-home/40 text-home hover:bg-home/10'
            )}
            onClick={() => setSelectedSide('CASA')}
          >
            {homeName.length > 8 ? homeName.slice(0, 8) + '…' : homeName}
          </Button>
          <Button
            variant={selectedSide === 'FORA' ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-9 px-3 text-xs font-semibold transition-all',
              selectedSide === 'FORA' 
                ? 'bg-away text-white hover:bg-away/90' 
                : 'border-away/40 text-away hover:bg-away/10'
            )}
            onClick={() => setSelectedSide('FORA')}
          >
            {awayName.length > 8 ? awayName.slice(0, 8) + '…' : awayName}
          </Button>
        </div>
      </div>
    </div>
  );
}
