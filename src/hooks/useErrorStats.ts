import { useMemo } from 'react';
import { Side, Rally, Player, MatchPlayer, Sanction } from '@/types/volleyball';

export interface PlayerErrorStats {
  playerId: string;
  playerName: string;
  jerseyNumber: number;
  side: Side;
  serveErrors: number;
  attackErrors: number;
  receptionErrors: number;
  blockErrors: number;
  totalErrors: number;
}

export interface TeamErrorTotals {
  serve: number;
  attack: number;
  reception: number;
  block: number;
  total: number;
}

export interface PlayerSanctionStats {
  playerId: string | null;
  playerName: string;
  jerseyNumber: number | null;
  side: Side;
  warnings: number;
  penalties: number;
  total: number;
}

export interface ErrorStatsResult {
  playerErrors: PlayerErrorStats[];
  teamTotals: { home: TeamErrorTotals; away: TeamErrorTotals };
  playerSanctions: PlayerSanctionStats[];
  teamSanctions: { home: number; away: number };
}

export function useErrorStats(
  rallies: Rally[],
  players: (Player | MatchPlayer)[],
  sanctions: Sanction[],
  filters: { side: Side | 'TODAS'; selectedSet: number }
): ErrorStatsResult {
  return useMemo(() => {
    const filteredRallies = filters.selectedSet === 0
      ? rallies
      : rallies.filter(r => r.set_no === filters.selectedSet);

    const filteredSanctions = filters.selectedSet === 0
      ? sanctions
      : sanctions.filter(s => s.set_no === filters.selectedSet);

    const playerSideMap: Record<string, Side> = {};
    const playerMetaMap: Record<string, { name: string; jerseyNumber: number }> = {};
    players.forEach(p => {
      playerSideMap[p.id] = p.side as Side;
      playerMetaMap[p.id] = { name: p.name, jerseyNumber: p.jersey_number };
    });

    // Error stats from rallies
    const errorMap: Record<string, PlayerErrorStats> = {};

    const getOrCreate = (playerId: string): PlayerErrorStats => {
      if (!errorMap[playerId]) {
        const meta = playerMetaMap[playerId];
        errorMap[playerId] = {
          playerId,
          playerName: meta?.name || 'Desconhecido',
          jerseyNumber: meta?.jerseyNumber || 0,
          side: playerSideMap[playerId] || 'CASA',
          serveErrors: 0, attackErrors: 0, receptionErrors: 0, blockErrors: 0, totalErrors: 0,
        };
      }
      return errorMap[playerId];
    };

    // Get final phase per rally
    const finalPhases: Record<string, Rally> = {};
    filteredRallies.forEach(r => {
      const key = `${r.set_no}-${r.rally_no}`;
      if (!finalPhases[key] || r.phase > finalPhases[key].phase) {
        finalPhases[key] = r;
      }
    });

    Object.values(finalPhases).forEach(r => {
      // Serve error
      if (r.s_player_id && r.s_code === 0) {
        getOrCreate(r.s_player_id).serveErrors++;
      }
      // Attack error
      if (r.a_player_id && r.a_code === 0) {
        getOrCreate(r.a_player_id).attackErrors++;
      }
      // Reception error
      if (r.r_player_id && r.r_code === 0) {
        getOrCreate(r.r_player_id).receptionErrors++;
      }
      // Block error
      if (r.b1_player_id && r.b_code === 0) {
        getOrCreate(r.b1_player_id).blockErrors++;
      }
    });

    // Calculate totals
    Object.values(errorMap).forEach(e => {
      e.totalErrors = e.serveErrors + e.attackErrors + e.receptionErrors + e.blockErrors;
    });

    const playerErrors = Object.values(errorMap)
      .filter(e => e.totalErrors > 0 && (filters.side === 'TODAS' || e.side === filters.side))
      .sort((a, b) => b.totalErrors - a.totalErrors);

    const teamTotals = {
      home: { serve: 0, attack: 0, reception: 0, block: 0, total: 0 },
      away: { serve: 0, attack: 0, reception: 0, block: 0, total: 0 },
    };
    Object.values(errorMap).forEach(e => {
      const t = e.side === 'CASA' ? teamTotals.home : teamTotals.away;
      t.serve += e.serveErrors;
      t.attack += e.attackErrors;
      t.reception += e.receptionErrors;
      t.block += e.blockErrors;
      t.total += e.totalErrors;
    });

    // Sanctions
    const sanctionMap: Record<string, PlayerSanctionStats> = {};
    let homeSanctions = 0;
    let awaySanctions = 0;

    filteredSanctions.forEach(s => {
      const key = s.player_id || `staff-${s.side}-${s.coach_staff_name}`;
      const side = s.side as Side;

      if (!sanctionMap[key]) {
        sanctionMap[key] = {
          playerId: s.player_id,
          playerName: s.player_name || s.coach_staff_name || 'Staff',
          jerseyNumber: s.player_jersey,
          side,
          warnings: 0, penalties: 0, total: 0,
        };
      }

      if (s.sanction_type === 'WARNING' || s.sanction_type === 'DELAY_WARNING') {
        sanctionMap[key].warnings++;
      } else {
        sanctionMap[key].penalties++;
      }
      sanctionMap[key].total++;

      if (side === 'CASA') homeSanctions++;
      else awaySanctions++;
    });

    const playerSanctions = Object.values(sanctionMap)
      .filter(s => filters.side === 'TODAS' || s.side === filters.side)
      .sort((a, b) => b.total - a.total);

    return {
      playerErrors,
      teamTotals,
      playerSanctions,
      teamSanctions: { home: homeSanctions, away: awaySanctions },
    };
  }, [rallies, players, sanctions, filters.side, filters.selectedSet]);
}
