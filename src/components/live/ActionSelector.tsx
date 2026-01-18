import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Swords, Square, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RallyActionType, Side, RallyAction } from '@/types/volleyball';

interface ActionSelectorProps {
  actions: RallyAction[];
  serveSide: Side;
  recvSide: Side;
  homeName: string;
  awayName: string;
  onSelectAction: (type: RallyActionType, side: Side) => void;
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
}: ActionSelectorProps) {
  // Selected team state with intelligent inference
  const [selectedSide, setSelectedSide] = useState<Side>(recvSide);

  // Smart inference: update selected side based on last action
  useEffect(() => {
    const lastAction = actions[actions.length - 1];
    
    if (!lastAction) {
      // After reception, receiver attacks
      setSelectedSide(recvSide);
      return;
    }
    
    // After attack → opponent side (block/defense)
    if (lastAction.type === 'attack') {
      setSelectedSide(lastAction.side === 'CASA' ? 'FORA' : 'CASA');
    }
    // After block/defense → same side (counter-attack)
    else if (lastAction.type === 'defense' || lastAction.type === 'block') {
      setSelectedSide(lastAction.side);
    }
    // After setter → same side continues (attack)
    else if (lastAction.type === 'setter') {
      setSelectedSide(lastAction.side);
    }
  }, [actions, recvSide]);

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
      </CardContent>
    </Card>
  );
}
