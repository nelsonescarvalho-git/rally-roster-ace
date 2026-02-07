import { CircleDot, Shield, Target, Swords, Square, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TimelineItem } from './TimelineItem';
import type { RallyActionWithPlayer, ActionType } from '@/types/rallyActions';
import { ACTION_CODE_LABELS, ACTION_TYPE_INFO } from '@/types/rallyActions';
import { cn } from '@/lib/utils';

interface RallyActionsTimelineProps {
  actions: RallyActionWithPlayer[];
  homeName: string;
  awayName: string;
}

const ACTION_ICONS: Record<ActionType, typeof CircleDot> = {
  serve: CircleDot,
  reception: Shield,
  setter: Target,
  attack: Swords,
  block: Square,
  defense: ShieldCheck,
};

export function RallyActionsTimeline({ actions, homeName, awayName }: RallyActionsTimelineProps) {
  if (!actions || actions.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        <Badge variant="outline" className="text-[10px]">Sem ações detalhadas</Badge>
      </div>
    );
  }

  const sortedActions = [...actions].sort((a, b) => a.sequence_no - b.sequence_no);

  return (
    <div className="space-y-1">
      {sortedActions.map((action, idx) => {
        const isLast = idx === sortedActions.length - 1;
        const Icon = ACTION_ICONS[action.action_type as ActionType] || CircleDot;
        const actionInfo = ACTION_TYPE_INFO[action.action_type as ActionType];
        const teamSide = action.side === 'CASA' ? 'home' : 'away';
        const teamName = action.side === 'CASA' ? homeName : awayName;
        
        // Check for partial/incomplete data
        const isPartial = 
          (action.player_id && action.code === null) ||
          (action.code !== null && !action.player_id && action.action_type !== 'block');
        
        // Build extra info for attacks/blocks
        let extra: string | undefined;
        if (action.action_type === 'attack' && action.kill_type) {
          extra = action.kill_type;
        }
        if (action.action_type === 'setter' && action.pass_destination) {
          extra = action.pass_destination;
        }
        
        // Block extra info with multiple players
        let blockPlayers: string | undefined;
        if (action.action_type === 'block') {
          const players: string[] = [];
          if (action.b2_player_jersey) players.push(`+#${action.b2_player_jersey}`);
          if (action.b3_player_jersey) players.push(`+#${action.b3_player_jersey}`);
          if (players.length > 0) blockPlayers = players.join(' ');
        }
        
        // Warning for missing data
        let warning: string | undefined;
        if (action.action_type === 'attack' && action.code === 3 && !action.kill_type) {
          warning = 'Kill type em falta';
        }
        if (action.action_type === 'setter' && action.player_id && !action.pass_destination) {
          warning = 'Destino em falta';
        }
        
        // Highlight kills
        const highlight = action.action_type === 'attack' && action.code === 3;

        return (
          <TimelineItem
            key={action.id}
            icon={Icon}
            action={actionInfo?.labelPt || action.action_type}
            team={teamName.slice(0, 3)}
            teamColor={teamSide}
            playerNumber={action.player_jersey || action.player_no}
            playerName={action.action_type === 'block' ? blockPlayers : action.player_name}
            code={action.code}
            extra={extra}
            isLast={isLast}
            highlight={highlight}
            warning={warning}
            isPartial={isPartial}
            partialMessage={action.player_id ? 'Código em falta' : 'Jogador em falta'}
          />
        );
      })}
    </div>
  );
}
