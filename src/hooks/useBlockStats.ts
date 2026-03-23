import { useMemo } from 'react';
import { Side, Player, MatchPlayer } from '@/types/volleyball';
import { RallyActionWithPlayer } from '@/types/rallyActions';

export interface PlayerBlockStats {
  playerId: string;
  playerName: string;
  jerseyNumber: number;
  side: Side;
  points: number;    // code 3
  defensive: number;  // code 2
  offensive: number;  // code 1
  errors: number;     // code 0
  total: number;
  efficiencyPercent: number; // points/total
}

export function useBlockStats(
  rallyActionsMap: Map<string, RallyActionWithPlayer[]> | undefined,
  players: (Player | MatchPlayer)[],
  filters: { side: Side | 'TODAS'; selectedSet: number }
) {
  return useMemo(() => {
    if (!rallyActionsMap) return [];

    const statsMap: Record<string, PlayerBlockStats> = {};

    const addParticipation = (playerId: string, name: string, jersey: number, side: Side, code: number) => {
      if (!statsMap[playerId]) {
        statsMap[playerId] = {
          playerId,
          playerName: name,
          jerseyNumber: jersey,
          side,
          points: 0, defensive: 0, offensive: 0, errors: 0,
          total: 0,
          efficiencyPercent: 0,
        };
      }
      const s = statsMap[playerId];
      s.total++;
      if (code === 3) s.points++;
      else if (code === 2) s.defensive++;
      else if (code === 1) s.offensive++;
      else if (code === 0) s.errors++;
    };

    rallyActionsMap.forEach((actions) => {
      const blocks = actions.filter(a =>
        a.action_type === 'block' &&
        a.code !== null &&
        (filters.side === 'TODAS' || a.side === filters.side)
      );

      blocks.forEach(action => {
        const code = action.code!;

        // Primary blocker
        if (action.player_id) {
          const player = players.find(p => p.id === action.player_id);
          addParticipation(
            action.player_id,
            player?.name || action.player_name || 'Desconhecido',
            player?.jersey_number || action.player_jersey || 0,
            action.side as Side,
            code
          );
        }

        // Secondary blocker b2
        if (action.b2_player_id) {
          const p2 = players.find(p => p.id === action.b2_player_id);
          addParticipation(
            action.b2_player_id,
            p2?.name || action.b2_player_name || 'Desconhecido',
            p2?.jersey_number || action.b2_player_jersey || 0,
            action.side as Side,
            code
          );
        }

        // Secondary blocker b3
        if (action.b3_player_id) {
          const p3 = players.find(p => p.id === action.b3_player_id);
          addParticipation(
            action.b3_player_id,
            p3?.name || action.b3_player_name || 'Desconhecido',
            p3?.jersey_number || action.b3_player_jersey || 0,
            action.side as Side,
            code
          );
        }
      });
    });

    Object.values(statsMap).forEach(s => {
      if (s.total > 0) {
        s.efficiencyPercent = Math.round((s.points / s.total) * 100);
      }
    });

    return Object.values(statsMap)
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [rallyActionsMap, players, filters.side, filters.selectedSet]);
}
