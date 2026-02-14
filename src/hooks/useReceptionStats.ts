import { useMemo } from 'react';
import { Side, Player, MatchPlayer } from '@/types/volleyball';
import { RallyActionWithPlayer } from '@/types/rallyActions';

export interface PlayerReceptionStats {
  playerId: string;
  playerName: string;
  jerseyNumber: number;
  side: Side;
  q3: number;
  q2: number;
  q1: number;
  q0: number;
  total: number;
  positivePercent: number; // (Q2+Q3)/Total
  excellentPercent: number; // Q3/Total
}

export function useReceptionStats(
  rallyActionsMap: Map<string, RallyActionWithPlayer[]> | undefined,
  players: (Player | MatchPlayer)[],
  filters: { side: Side | 'TODAS'; selectedSet: number }
) {
  return useMemo(() => {
    if (!rallyActionsMap) return [];

    const statsMap: Record<string, PlayerReceptionStats> = {};

    rallyActionsMap.forEach((actions, rallyId) => {
      // Filter by set if needed
      // rallyId doesn't contain set info, but actions have side
      const receptions = actions.filter(a => 
        a.action_type === 'reception' && 
        a.code !== null &&
        (filters.side === 'TODAS' || a.side === filters.side)
      );

      receptions.forEach(action => {
        const playerId = action.player_id;
        if (!playerId) return;

        if (!statsMap[playerId]) {
          const player = players.find(p => p.id === playerId);
          statsMap[playerId] = {
            playerId,
            playerName: player?.name || action.player_name || 'Desconhecido',
            jerseyNumber: player?.jersey_number || action.player_jersey || 0,
            side: action.side as Side,
            q3: 0, q2: 0, q1: 0, q0: 0,
            total: 0,
            positivePercent: 0,
            excellentPercent: 0,
          };
        }

        const s = statsMap[playerId];
        s.total++;
        if (action.code === 3) s.q3++;
        else if (action.code === 2) s.q2++;
        else if (action.code === 1) s.q1++;
        else if (action.code === 0) s.q0++;
      });
    });

    // Calculate percentages
    Object.values(statsMap).forEach(s => {
      if (s.total > 0) {
        s.positivePercent = Math.round(((s.q2 + s.q3) / s.total) * 100);
        s.excellentPercent = Math.round((s.q3 / s.total) * 100);
      }
    });

    return Object.values(statsMap)
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [rallyActionsMap, players, filters.side, filters.selectedSet]);
}
