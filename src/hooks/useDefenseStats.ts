import { useMemo } from 'react';
import { Side, Player, MatchPlayer } from '@/types/volleyball';
import { RallyActionWithPlayer } from '@/types/rallyActions';

export interface PlayerDefenseStats {
  playerId: string;
  playerName: string;
  jerseyNumber: number;
  side: Side;
  excellent: number; // code 3
  good: number; // code 2
  poor: number; // code 1
  bad: number; // code 0
  total: number;
  positivePercent: number; // (2+3)/Total
  excellentPercent: number; // 3/Total
}

export function useDefenseStats(
  rallyActionsMap: Map<string, RallyActionWithPlayer[]> | undefined,
  players: (Player | MatchPlayer)[],
  filters: { side: Side | 'TODAS'; selectedSet: number }
) {
  return useMemo(() => {
    if (!rallyActionsMap) return [];

    const statsMap: Record<string, PlayerDefenseStats> = {};

    rallyActionsMap.forEach((actions) => {
      const defenses = actions.filter(a => 
        a.action_type === 'defense' && 
        a.code !== null &&
        (filters.side === 'TODAS' || a.side === filters.side)
      );

      defenses.forEach(action => {
        const playerId = action.player_id;
        if (!playerId) return;

        if (!statsMap[playerId]) {
          const player = players.find(p => p.id === playerId);
          statsMap[playerId] = {
            playerId,
            playerName: player?.name || action.player_name || 'Desconhecido',
            jerseyNumber: player?.jersey_number || action.player_jersey || 0,
            side: action.side as Side,
            excellent: 0, good: 0, poor: 0, bad: 0,
            total: 0,
            positivePercent: 0,
            excellentPercent: 0,
          };
        }

        const s = statsMap[playerId];
        s.total++;
        if (action.code === 3) s.excellent++;
        else if (action.code === 2) s.good++;
        else if (action.code === 1) s.poor++;
        else if (action.code === 0) s.bad++;
      });
    });

    Object.values(statsMap).forEach(s => {
      if (s.total > 0) {
        s.positivePercent = Math.round(((s.excellent + s.good) / s.total) * 100);
        s.excellentPercent = Math.round((s.excellent / s.total) * 100);
      }
    });

    return Object.values(statsMap)
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [rallyActionsMap, players, filters.side, filters.selectedSet]);
}
