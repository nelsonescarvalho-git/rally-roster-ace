import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Swords, Square, ShieldCheck, Shield, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RallyActionType, Side, RallyAction } from '@/types/volleyball';

interface ActionSelectorProps {
  actions: RallyAction[];
  serveSide: Side;
  recvSide: Side;
  homeName: string;
  awayName: string;
  onSelectAction: (type: RallyActionType, side: Side) => void;
  /** Whether reception is incomplete and should be shown as an option */
  showReceptionOption?: boolean;
  /** Callback for back navigation */
  onBack?: () => void;
  /** Label for back button */
  backLabel?: string;
}

const ACTION_OPTIONS = [
  { type: 'setter' as RallyActionType, label: 'D', fullLabel: 'Distribuição', icon: Target },
  { type: 'attack' as RallyActionType, label: 'A', fullLabel: 'Ataque', icon: Swords },
  { type: 'block' as RallyActionType, label: 'B', fullLabel: 'Bloco', icon: Square },
  { type: 'defense' as RallyActionType, label: 'Df', fullLabel: 'Defesa', icon: ShieldCheck },
];

export function ActionSelector({
  actions,
  serveSide,
  recvSide,
  homeName,
  awayName,
  onSelectAction,
  showReceptionOption = false,
  onBack,
  backLabel = 'Voltar',
}: ActionSelectorProps) {
  // Calculate inferred side based on last action (using useMemo for immediate sync)
  const inferredSide = useMemo(() => {
    const lastAction = actions[actions.length - 1];
    
    if (!lastAction) {
      // After reception, receiver attacks
      return recvSide;
    }
    
    // Reception that went over the net → opponent plays next
    if (lastAction.type === 'reception' && lastAction.overTheNet) {
      return lastAction.side === 'CASA' ? 'FORA' : 'CASA';
    }
    
    // Normal reception → same team continues
    if (lastAction.type === 'reception') {
      return lastAction.side;
    }
    
    // After attack → opponent side (block/defense)
    if (lastAction.type === 'attack') {
      return lastAction.side === 'CASA' ? 'FORA' : 'CASA';
    }
    // After block/defense → same side (counter-attack)
    if (lastAction.type === 'defense' || lastAction.type === 'block') {
      return lastAction.side;
    }
    // After setter → same side continues (attack)
    if (lastAction.type === 'setter') {
      return lastAction.side;
    }
    
    return recvSide;
  }, [actions, recvSide]);

  // Selected team state - syncs with inferred side but allows manual override
  const [selectedSide, setSelectedSide] = useState<Side>(inferredSide);

  // Sync selectedSide when inferredSide changes
  useEffect(() => {
    setSelectedSide(inferredSide);
  }, [inferredSide]);

  const selectedTeamName = selectedSide === 'CASA' ? homeName : awayName;

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        {/* Team Toggle */}
        <div className="flex gap-2">
          <Button
            variant={selectedSide === 'CASA' ? 'default' : 'outline'}
            className={cn(
              'flex-1 h-11 transition-all font-semibold',
              selectedSide === 'CASA' 
                ? 'bg-home text-white hover:bg-home/90' 
                : 'border-home/40 text-home hover:bg-home/10'
            )}
            onClick={() => setSelectedSide('CASA')}
          >
            {homeName}
          </Button>
          <Button
            variant={selectedSide === 'FORA' ? 'default' : 'outline'}
            className={cn(
              'flex-1 h-11 transition-all font-semibold',
              selectedSide === 'FORA' 
                ? 'bg-away text-white hover:bg-away/90' 
                : 'border-away/40 text-away hover:bg-away/10'
            )}
            onClick={() => setSelectedSide('FORA')}
          >
            {awayName}
          </Button>
        </div>

        {/* Reception Edit Button (shown when reception is incomplete) */}
        {showReceptionOption && (
          <Button
            variant="outline"
            className="w-full h-12 gap-2 border-success bg-success/10 hover:bg-success/20 text-success"
            onClick={() => onSelectAction('reception', recvSide)}
          >
            <Shield className="h-5 w-5" />
            <span>Definir Receção</span>
          </Button>
        )}

        {/* Action Buttons */}
        <div className="text-xs font-medium text-muted-foreground">
          Próxima Ação — <span className={selectedSide === 'CASA' ? 'text-home' : 'text-away'}>{selectedTeamName}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {ACTION_OPTIONS.map((option) => {
            const Icon = option.icon;
            
            return (
              <Button
                key={option.type}
                variant="outline"
                className={cn(
                  'flex-col h-16 gap-1 transition-all',
                  selectedSide === 'CASA' 
                    ? 'border-home bg-home/5 hover:bg-home/15 text-home' 
                    : 'border-away bg-away/5 hover:bg-away/15 text-away'
                )}
                onClick={() => onSelectAction(option.type, selectedSide)}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px]">{option.fullLabel}</span>
              </Button>
            );
          })}
        </div>

        {/* Navigation footer - consistent with all phases */}
        {onBack && (
          <div className="flex gap-2 pt-3 border-t mt-3">
            <Button 
              variant="outline" 
              className="flex-1 gap-2" 
              onClick={onBack}
            >
              <ChevronLeft className="h-4 w-4" />
              {backLabel}
            </Button>
            <div className="flex-1" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
