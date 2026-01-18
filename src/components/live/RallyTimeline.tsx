import { Badge } from '@/components/ui/badge';
import { X, CircleDot, Shield, Target, Swords, Square, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RallyAction, RallyActionType, Side, Player } from '@/types/volleyball';

interface RallyTimelineProps {
  actions: RallyAction[];
  players: Player[];
  onRemoveAction: (index: number) => void;
  homeName: string;
  awayName: string;
}

const ACTION_CONFIG: Record<RallyActionType, { 
  icon: React.ElementType; 
  label: string; 
  shortLabel: string;
  color: string;
}> = {
  serve: { icon: CircleDot, label: 'Serviço', shortLabel: 'S', color: 'bg-primary' },
  reception: { icon: Shield, label: 'Receção', shortLabel: 'R', color: 'bg-success' },
  setter: { icon: Target, label: 'Distribuição', shortLabel: 'D', color: 'bg-[hsl(280,68%,50%)]' },
  attack: { icon: Swords, label: 'Ataque', shortLabel: 'A', color: 'bg-destructive' },
  block: { icon: Square, label: 'Bloco', shortLabel: 'B', color: 'bg-warning' },
  defense: { icon: ShieldCheck, label: 'Defesa', shortLabel: 'Df', color: 'bg-accent' },
};

const CODE_EMOJI: Record<number, string> = {
  0: '✕',
  1: '−',
  2: '+',
  3: '★',
};

export function RallyTimeline({ 
  actions, 
  players,
  onRemoveAction, 
  homeName, 
  awayName 
}: RallyTimelineProps) {
  if (actions.length === 0) {
    return (
      <div className="p-3 bg-muted/30 rounded-lg text-center text-sm text-muted-foreground">
        Sem ações registadas
      </div>
    );
  }

  const getPlayerDisplay = (action: RallyAction) => {
    if (action.playerNo) {
      return `#${action.playerNo}`;
    }
    if (action.playerId) {
      const player = players.find(p => p.id === action.playerId);
      return player ? `#${player.jersey_number}` : '';
    }
    return '';
  };

  const getCodeDisplay = (code: number | null | undefined) => {
    if (code === null || code === undefined) return '';
    return CODE_EMOJI[code] || code.toString();
  };

  return (
    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        Ações Registadas ({actions.length})
      </div>
      
      {/* Simple linear list - no phase grouping */}
      <div className="flex flex-wrap gap-1.5">
        {actions.map((action, index) => {
          const config = ACTION_CONFIG[action.type];
          const Icon = config.icon;
          const isHome = action.side === 'CASA';
          
          return (
            <Badge
              key={index}
              variant="outline"
              className={cn(
                'cursor-pointer transition-all hover:scale-105 group relative pr-5',
                isHome ? 'border-home/50 bg-home/10' : 'border-away/50 bg-away/10'
              )}
              onClick={() => onRemoveAction(index)}
            >
              <span className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center mr-1 text-[10px] text-white',
                config.color
              )}>
                {config.shortLabel}
              </span>
              <span className="font-medium">{getPlayerDisplay(action)}</span>
              {action.code !== null && action.code !== undefined && (
                <span className="ml-0.5 opacity-75">
                  ({getCodeDisplay(action.code)})
                </span>
              )}
              <X className="h-3 w-3 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-destructive" />
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
