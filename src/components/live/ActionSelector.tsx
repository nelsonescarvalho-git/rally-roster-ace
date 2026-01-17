import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CircleDot, Shield, Target, Swords, Square, ShieldCheck, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RallyActionType, Side, RallyAction } from '@/types/volleyball';

export interface ActionOption {
  type: RallyActionType | 'new_phase';
  label: string;
  fullLabel: string;
  icon: React.ElementType;
  available: boolean;
  side?: Side;
}

interface ActionSelectorProps {
  actions: RallyAction[];
  currentPhase: number;
  serveSide: Side;
  recvSide: Side;
  homeName: string;
  awayName: string;
  onSelectAction: (type: RallyActionType, side: Side) => void;
  onNewPhase: () => void;
}

export function ActionSelector({
  actions,
  currentPhase,
  serveSide,
  recvSide,
  homeName,
  awayName,
  onSelectAction,
  onNewPhase,
}: ActionSelectorProps) {
  // Determine which side should do what based on current state
  const lastAction = actions[actions.length - 1];
  const actionsInCurrentPhase = actions.filter(a => a.phase === currentPhase);
  
  // Helper to check if action type exists in current phase
  const hasActionInPhase = (type: RallyActionType) => 
    actionsInCurrentPhase.some(a => a.type === type);

  // Helper to get the last attack side
  const getLastAttackSide = (): Side | null => {
    const lastAttack = [...actionsInCurrentPhase].reverse().find(a => a.type === 'attack');
    return lastAttack?.side || null;
  };

  // Determine default sides for each action
  const determineAttackSide = (): Side => {
    // In phase 1, receiver attacks first
    // In later phases, it alternates based on who defended
    if (currentPhase === 1) {
      return recvSide;
    }
    // Check last defense or block - opposite side attacks
    const lastDefenseAction = [...actionsInCurrentPhase].reverse().find(
      a => a.type === 'defense' || a.type === 'block'
    );
    if (lastDefenseAction) {
      return lastDefenseAction.side === 'CASA' ? 'FORA' : 'CASA';
    }
    return recvSide;
  };

  const determineDefenseSide = (): Side => {
    const lastAttackSide = getLastAttackSide();
    if (lastAttackSide) {
      return lastAttackSide === 'CASA' ? 'FORA' : 'CASA';
    }
    return serveSide;
  };

  const attackSide = determineAttackSide();
  const defenseSide = determineDefenseSide();

  // Build available actions
  const actionOptions: ActionOption[] = [];

  // Distribuição - if no setter in current phase for the attacking side
  if (!hasActionInPhase('setter') || actionsInCurrentPhase.filter(a => a.type === 'setter').length < 2) {
    actionOptions.push({
      type: 'setter',
      label: 'D',
      fullLabel: 'Distribuição',
      icon: Target,
      available: true,
      side: attackSide,
    });
  }

  // Ataque - always available (can have multiple attacks in recycled balls)
  actionOptions.push({
    type: 'attack',
    label: 'A',
    fullLabel: 'Ataque',
    icon: Swords,
    available: true,
    side: attackSide,
  });

  // Bloco - available if there was an attack
  if (hasActionInPhase('attack')) {
    actionOptions.push({
      type: 'block',
      label: 'B',
      fullLabel: 'Bloco',
      icon: Square,
      available: true,
      side: defenseSide,
    });
  }

  // Defesa - available if there was attack or block
  if (hasActionInPhase('attack') || hasActionInPhase('block')) {
    actionOptions.push({
      type: 'defense',
      label: 'Df',
      fullLabel: 'Defesa',
      icon: ShieldCheck,
      available: true,
      side: defenseSide,
    });
  }

  // Nova Fase - always available after at least one action in phase
  if (actionsInCurrentPhase.length > 0) {
    actionOptions.push({
      type: 'new_phase',
      label: '+',
      fullLabel: 'Nova Fase',
      icon: Plus,
      available: true,
    });
  }

  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Próxima Ação
        </div>
        <div className="grid grid-cols-5 gap-2">
          {actionOptions.map((option) => {
            const Icon = option.icon;
            const isNewPhase = option.type === 'new_phase';
            const sideColor = option.side === 'CASA' ? 'home' : 'away';
            
            return (
              <Button
                key={option.type}
                variant="outline"
                className={cn(
                  'flex-col h-16 gap-1 relative',
                  !isNewPhase && option.side && `border-${sideColor}/50 hover:bg-${sideColor}/10`,
                  isNewPhase && 'border-dashed'
                )}
                onClick={() => {
                  if (isNewPhase) {
                    onNewPhase();
                  } else {
                    onSelectAction(option.type as RallyActionType, option.side!);
                  }
                }}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px]">{option.fullLabel}</span>
                {!isNewPhase && option.side && (
                  <span className={cn(
                    'absolute top-0.5 right-0.5 text-[8px] px-1 rounded',
                    option.side === 'CASA' ? 'bg-home/20 text-home' : 'bg-away/20 text-away'
                  )}>
                    {option.side === 'CASA' ? homeName.slice(0, 3) : awayName.slice(0, 3)}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
