import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Rally, MatchPlayer, PlayerStats, Side } from '@/types/volleyball';

interface GlobalPlayerStats extends PlayerStats {
  teamName: string;
  matchCount: number;
}

interface GlobalSummary {
  totalMatches: number;
  totalRallies: number;
  totalPoints: number;
  avgAttackEfficiency: number;
  avgSideoutPercent: number;
  acesPerMatch: number;
  blocksPerMatch: number;
}

export function useGlobalStats() {
  const [rallies, setRallies] = useState<Rally[]>([]);
  const [players, setPlayers] = useState<MatchPlayer[]>([]);
  const [matches, setMatches] = useState<{ id: string; home_name: string; away_name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      const [ralliesRes, playersRes, matchesRes] = await Promise.all([
        supabase.from('rallies').select('*'),
        supabase.from('match_players').select('*'),
        supabase.from('matches').select('id, home_name, away_name'),
      ]);

      if (ralliesRes.data) {
        setRallies(ralliesRes.data as Rally[]);
      }
      if (playersRes.data) {
        setPlayers(playersRes.data as MatchPlayer[]);
      }
      if (matchesRes.data) {
        setMatches(matchesRes.data);
      }
      
      setLoading(false);
    }

    loadData();
  }, []);

  const playerStats = useMemo(() => {
    // Group players by team_player_id to aggregate across matches
    const playerMap: Record<string, {
      stats: GlobalPlayerStats;
      matchIds: Set<string>;
    }> = {};

    // Get final phases only
    const finalPhases = rallies.reduce((acc, rally) => {
      const key = `${rally.match_id}-${rally.set_no}-${rally.rally_no}`;
      if (!acc[key] || rally.phase > acc[key].phase) {
        acc[key] = rally;
      }
      return acc;
    }, {} as Record<string, Rally>);

    // Initialize stats for each player
    players.forEach(player => {
      const key = player.team_player_id || player.id;
      const match = matches.find(m => m.id === player.match_id);
      const teamName = player.side === 'CASA' 
        ? match?.home_name || 'Casa' 
        : match?.away_name || 'Fora';

      if (!playerMap[key]) {
        playerMap[key] = {
          stats: {
            playerId: key,
            playerName: player.name,
            jerseyNumber: player.jersey_number,
            side: player.side as Side,
            teamName,
            matchCount: 0,
            serveAttempts: 0,
            servePoints: 0,
            serveErrors: 0,
            serveAvg: 0,
            recAttempts: 0,
            recPoints: 0,
            recErrors: 0,
            recAvg: 0,
            attAttempts: 0,
            attPoints: 0,
            attErrors: 0,
            attAvg: 0,
            attEfficiency: 0,
            blkAttempts: 0,
            blkPoints: 0,
            blkErrors: 0,
            defAttempts: 0,
            defPoints: 0,
            defErrors: 0,
            defAvg: 0,
          },
          matchIds: new Set(),
        };
      }
      playerMap[key].matchIds.add(player.match_id);
    });

    // Create a mapping from match_player id to aggregation key
    const playerIdToKey: Record<string, string> = {};
    players.forEach(p => {
      playerIdToKey[p.id] = p.team_player_id || p.id;
    });

    // Process rallies
    Object.values(finalPhases).forEach(rally => {
      // Serve
      if (rally.s_player_id && rally.s_code !== null) {
        const key = playerIdToKey[rally.s_player_id];
        if (key && playerMap[key]) {
          playerMap[key].stats.serveAttempts++;
          if (rally.s_code === 3) playerMap[key].stats.servePoints++;
          if (rally.s_code === 0) playerMap[key].stats.serveErrors++;
        }
      }

      // Reception
      if (rally.r_player_id && rally.r_code !== null) {
        const key = playerIdToKey[rally.r_player_id];
        if (key && playerMap[key]) {
          playerMap[key].stats.recAttempts++;
          if (rally.r_code === 3) playerMap[key].stats.recPoints++;
          if (rally.r_code === 0) playerMap[key].stats.recErrors++;
        }
      }

      // Attack
      if (rally.a_player_id && rally.a_code !== null) {
        const key = playerIdToKey[rally.a_player_id];
        if (key && playerMap[key]) {
          playerMap[key].stats.attAttempts++;
          if (rally.a_code === 3) playerMap[key].stats.attPoints++;
          if (rally.a_code === 0) playerMap[key].stats.attErrors++;
        }
      }

      // Block
      if (rally.b_code !== null) {
        [rally.b1_player_id, rally.b2_player_id, rally.b3_player_id].forEach(pid => {
          if (pid) {
            const key = playerIdToKey[pid];
            if (key && playerMap[key]) {
              playerMap[key].stats.blkAttempts++;
              if (rally.b_code === 3) playerMap[key].stats.blkPoints++;
              if (rally.b_code === 0) playerMap[key].stats.blkErrors++;
            }
          }
        });
      }

      // Defense
      if (rally.d_player_id && rally.d_code !== null) {
        const key = playerIdToKey[rally.d_player_id];
        if (key && playerMap[key]) {
          playerMap[key].stats.defAttempts++;
          if (rally.d_code === 3) playerMap[key].stats.defPoints++;
          if (rally.d_code === 0) playerMap[key].stats.defErrors++;
        }
      }
    });

    // Calculate averages and match count
    Object.values(playerMap).forEach(({ stats, matchIds }) => {
      stats.matchCount = matchIds.size;
      
      if (stats.serveAttempts > 0) {
        stats.serveAvg = (stats.servePoints * 3 + (stats.serveAttempts - stats.servePoints - stats.serveErrors) * 1.5) / stats.serveAttempts;
      }
      if (stats.recAttempts > 0) {
        stats.recAvg = (stats.recPoints * 3 + (stats.recAttempts - stats.recPoints - stats.recErrors) * 1.5) / stats.recAttempts;
      }
      if (stats.attAttempts > 0) {
        stats.attAvg = (stats.attPoints * 3 + (stats.attAttempts - stats.attPoints - stats.attErrors) * 1.5) / stats.attAttempts;
        stats.attEfficiency = (stats.attPoints - stats.attErrors) / stats.attAttempts;
      }
      if (stats.defAttempts > 0) {
        stats.defAvg = (stats.defPoints * 3 + (stats.defAttempts - stats.defPoints - stats.defErrors) * 1.5) / stats.defAttempts;
      }
    });

    return Object.values(playerMap).map(p => p.stats);
  }, [rallies, players, matches]);

  const summary = useMemo((): GlobalSummary => {
    const finalPhases = rallies.reduce((acc, rally) => {
      const key = `${rally.match_id}-${rally.set_no}-${rally.rally_no}`;
      if (!acc[key] || rally.phase > acc[key].phase) {
        acc[key] = rally;
      }
      return acc;
    }, {} as Record<string, Rally>);

    const completedRallies = Object.values(finalPhases).filter(r => r.point_won_by);
    const totalPoints = completedRallies.length;
    const totalMatches = matches.length;

    // Count aces and blocks
    let aces = 0;
    let blocks = 0;
    let sideoutAttempts = 0;
    let sideoutPoints = 0;

    completedRallies.forEach(rally => {
      if (rally.reason === 'ACE') aces++;
      if (rally.reason === 'BLK') blocks++;
      
      // Sideout: receiving team wins the point
      sideoutAttempts++;
      if (rally.point_won_by === rally.recv_side) {
        sideoutPoints++;
      }
    });

    // Calculate average attack efficiency
    const attackers = playerStats.filter(p => p.attAttempts >= 5);
    const avgAttackEfficiency = attackers.length > 0
      ? attackers.reduce((sum, p) => sum + p.attEfficiency, 0) / attackers.length
      : 0;

    return {
      totalMatches,
      totalRallies: totalPoints,
      totalPoints,
      avgAttackEfficiency,
      avgSideoutPercent: sideoutAttempts > 0 ? (sideoutPoints / sideoutAttempts) * 100 : 0,
      acesPerMatch: totalMatches > 0 ? aces / totalMatches : 0,
      blocksPerMatch: totalMatches > 0 ? blocks / totalMatches : 0,
    };
  }, [rallies, matches, playerStats]);

  // Rankings
  const topAttackers = useMemo(() => {
    return [...playerStats]
      .filter(p => p.attAttempts >= 5)
      .sort((a, b) => b.attEfficiency - a.attEfficiency)
      .slice(0, 10);
  }, [playerStats]);

  const topReceivers = useMemo(() => {
    return [...playerStats]
      .filter(p => p.recAttempts >= 5)
      .sort((a, b) => b.recAvg - a.recAvg)
      .slice(0, 10);
  }, [playerStats]);

  const topServers = useMemo(() => {
    return [...playerStats]
      .filter(p => p.serveAttempts >= 5)
      .sort((a, b) => b.serveAvg - a.serveAvg)
      .slice(0, 10);
  }, [playerStats]);

  const topBlockers = useMemo(() => {
    return [...playerStats]
      .filter(p => p.blkAttempts >= 3)
      .sort((a, b) => b.blkPoints - a.blkPoints)
      .slice(0, 10);
  }, [playerStats]);

  return {
    loading,
    summary,
    playerStats,
    topAttackers,
    topReceivers,
    topServers,
    topBlockers,
  };
}
