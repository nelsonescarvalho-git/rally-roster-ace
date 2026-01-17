import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Rally, MatchPlayer, PlayerStats, Side, PassDestination, POSITIONS_BY_RECEPTION } from '@/types/volleyball';

interface GlobalPlayerStats extends PlayerStats {
  teamName: string;
  matchCount: number;
}

interface SetterStats {
  playerId: string;
  playerName: string;
  jerseyNumber: number;
  teamName: string;
  side: Side;
  totalPasses: number;
  passCodeSum: number;
  passAvg: number;
  matchCount: number;
}

interface SetterDistributionKPI {
  playerId: string;
  playerName: string;
  jerseyNumber: number;
  teamName: string;
  side: Side;
  totalDistributions: number;
  avgAvailablePositions: number;
  usedWithinAvailable: number; // percentage
  destinationsByReception: {
    receptionCode: number;
    count: number;
    avgPositions: number;
  }[];
  matchCount: number;
}

interface GlobalReceptionBreakdown {
  receptionCode: number;
  qualityLabel: string;
  emoji: string;
  availableCount: number;
  totalRallies: number;
  destinations: Record<PassDestination | 'OUTROS', number>;
  topDestinations: string;
}

interface GlobalSummary {
  totalMatches: number;
  totalRallies: number;
  totalPoints: number;
  avgAttackEfficiency: number;
  avgSideoutPercent: number;
  acesPerMatch: number;
  blocksPerMatch: number;
  avgPassQuality: number;
  // New distribution KPIs
  avgDistributionWithinAvailable: number;
  avgAvailablePositions: number;
}

interface TeamDefenseStats {
  teamName: string;
  side: Side;
  killsSuffered: number;
  floorKillsSuffered: number;
  blockoutKillsSuffered: number;
  floorPct: number;
  blockoutPct: number;
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
            attFloorKills: 0,
            attBlockoutKills: 0,
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
          if (rally.a_code === 3) {
            playerMap[key].stats.attPoints++;
            // Track kill type
            if (rally.kill_type === 'FLOOR') {
              playerMap[key].stats.attFloorKills++;
            } else if (rally.kill_type === 'BLOCKOUT') {
              playerMap[key].stats.attBlockoutKills++;
            }
          }
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
    let passCodeSum = 0;
    let passCodeCount = 0;

    // Distribution KPIs
    let totalAvailablePositions = 0;
    let usedWithinAvailableCount = 0;
    let distributionCount = 0;

    // Process all rallies for pass quality (not just final phases)
    rallies.forEach(rally => {
      if (rally.pass_code !== null && rally.setter_player_id) {
        passCodeSum += rally.pass_code;
        passCodeCount++;
      }
    });

    // Process final phases for distribution stats
    Object.values(finalPhases).forEach(rally => {
      if (rally.setter_player_id && rally.pass_destination) {
        const rCode = rally.r_code ?? 0;
        const dest = rally.pass_destination as PassDestination;
        const availablePositions = POSITIONS_BY_RECEPTION[rCode] || POSITIONS_BY_RECEPTION[0];
        
        totalAvailablePositions += availablePositions.length;
        distributionCount++;
        
        if (availablePositions.includes(dest)) {
          usedWithinAvailableCount++;
        }
      }
    });

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
      avgPassQuality: passCodeCount > 0 ? passCodeSum / passCodeCount : 0,
      avgDistributionWithinAvailable: distributionCount > 0 
        ? (usedWithinAvailableCount / distributionCount) * 100 
        : 0,
      avgAvailablePositions: distributionCount > 0 
        ? totalAvailablePositions / distributionCount 
        : 0,
    };
  }, [rallies, matches, playerStats]);

  // Setter pass quality stats
  const setterStats = useMemo((): SetterStats[] => {
    const setterMap: Record<string, {
      stats: SetterStats;
      matchIds: Set<string>;
    }> = {};

    // Create a mapping from match_player id to aggregation key and player info
    const playerIdToKey: Record<string, string> = {};
    const playerIdToInfo: Record<string, { name: string; jerseyNumber: number; teamName: string; side: Side }> = {};
    
    players.forEach(p => {
      const key = p.team_player_id || p.id;
      playerIdToKey[p.id] = key;
      const match = matches.find(m => m.id === p.match_id);
      const teamName = p.side === 'CASA' 
        ? match?.home_name || 'Casa' 
        : match?.away_name || 'Fora';
      playerIdToInfo[p.id] = {
        name: p.name,
        jerseyNumber: p.jersey_number,
        teamName,
        side: p.side as Side,
      };
    });

    // Process all rallies with pass_code
    rallies.forEach(rally => {
      if (rally.setter_player_id && rally.pass_code !== null) {
        const key = playerIdToKey[rally.setter_player_id];
        const info = playerIdToInfo[rally.setter_player_id];
        
        if (!key || !info) return;

        if (!setterMap[key]) {
          setterMap[key] = {
            stats: {
              playerId: key,
              playerName: info.name,
              jerseyNumber: info.jerseyNumber,
              teamName: info.teamName,
              side: info.side,
              totalPasses: 0,
              passCodeSum: 0,
              passAvg: 0,
              matchCount: 0,
            },
            matchIds: new Set(),
          };
        }
        
        setterMap[key].stats.totalPasses++;
        setterMap[key].stats.passCodeSum += rally.pass_code;
        setterMap[key].matchIds.add(rally.match_id);
      }
    });

    // Calculate averages
    Object.values(setterMap).forEach(({ stats, matchIds }) => {
      stats.matchCount = matchIds.size;
      if (stats.totalPasses > 0) {
        stats.passAvg = stats.passCodeSum / stats.totalPasses;
      }
    });

    return Object.values(setterMap)
      .map(s => s.stats)
      .filter(s => s.totalPasses >= 3)
      .sort((a, b) => b.passAvg - a.passAvg);
  }, [rallies, players, matches]);

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

  const topSetters = useMemo(() => {
    return setterStats.slice(0, 10);
  }, [setterStats]);

  // Setter distribution KPIs
  const setterDistributionStats = useMemo((): SetterDistributionKPI[] => {
    const setterMap: Record<string, {
      stats: SetterDistributionKPI;
      matchIds: Set<string>;
      totalAvailable: number;
      usedWithinAvailable: number;
      byReception: Record<number, { count: number; totalPositions: number }>;
    }> = {};

    // Create mapping from match_player id to aggregation key
    const playerIdToKey: Record<string, string> = {};
    const playerIdToInfo: Record<string, { name: string; jerseyNumber: number; teamName: string; side: Side }> = {};

    players.forEach(p => {
      const key = p.team_player_id || p.id;
      playerIdToKey[p.id] = key;
      const match = matches.find(m => m.id === p.match_id);
      const teamName = p.side === 'CASA'
        ? match?.home_name || 'Casa'
        : match?.away_name || 'Fora';
      playerIdToInfo[p.id] = {
        name: p.name,
        jerseyNumber: p.jersey_number,
        teamName,
        side: p.side as Side,
      };
    });

    // Get final phases
    const finalPhases = rallies.reduce((acc, rally) => {
      const key = `${rally.match_id}-${rally.set_no}-${rally.rally_no}`;
      if (!acc[key] || rally.phase > acc[key].phase) {
        acc[key] = rally;
      }
      return acc;
    }, {} as Record<string, Rally>);

    // Process rallies with setter and destination
    Object.values(finalPhases).forEach(rally => {
      if (!rally.setter_player_id || !rally.pass_destination) return;

      const key = playerIdToKey[rally.setter_player_id];
      const info = playerIdToInfo[rally.setter_player_id];
      if (!key || !info) return;

      const rCode = rally.r_code ?? 0;
      const dest = rally.pass_destination as PassDestination;
      const availablePositions = POSITIONS_BY_RECEPTION[rCode] || POSITIONS_BY_RECEPTION[0];

      if (!setterMap[key]) {
        setterMap[key] = {
          stats: {
            playerId: key,
            playerName: info.name,
            jerseyNumber: info.jerseyNumber,
            teamName: info.teamName,
            side: info.side,
            totalDistributions: 0,
            avgAvailablePositions: 0,
            usedWithinAvailable: 0,
            destinationsByReception: [],
            matchCount: 0,
          },
          matchIds: new Set(),
          totalAvailable: 0,
          usedWithinAvailable: 0,
          byReception: {},
        };
      }

      setterMap[key].stats.totalDistributions++;
      setterMap[key].totalAvailable += availablePositions.length;
      setterMap[key].matchIds.add(rally.match_id);

      if (availablePositions.includes(dest)) {
        setterMap[key].usedWithinAvailable++;
      }

      if (!setterMap[key].byReception[rCode]) {
        setterMap[key].byReception[rCode] = { count: 0, totalPositions: 0 };
      }
      setterMap[key].byReception[rCode].count++;
      setterMap[key].byReception[rCode].totalPositions += availablePositions.length;
    });

    // Calculate averages
    Object.values(setterMap).forEach(({ stats, matchIds, totalAvailable, usedWithinAvailable, byReception }) => {
      stats.matchCount = matchIds.size;
      if (stats.totalDistributions > 0) {
        stats.avgAvailablePositions = totalAvailable / stats.totalDistributions;
        stats.usedWithinAvailable = (usedWithinAvailable / stats.totalDistributions) * 100;
      }
      stats.destinationsByReception = [3, 2, 1, 0].map(code => ({
        receptionCode: code,
        count: byReception[code]?.count || 0,
        avgPositions: byReception[code] 
          ? byReception[code].totalPositions / byReception[code].count 
          : (POSITIONS_BY_RECEPTION[code]?.length || 0),
      }));
    });

    return Object.values(setterMap)
      .map(s => s.stats)
      .filter(s => s.totalDistributions >= 5)
      .sort((a, b) => b.usedWithinAvailable - a.usedWithinAvailable);
  }, [rallies, players, matches]);

  // Global reception breakdown for charts
  const globalReceptionBreakdown = useMemo((): GlobalReceptionBreakdown[] => {
    const RECEPTION_INFO: Record<number, { emoji: string; label: string }> = {
      3: { emoji: '⭐', label: 'Excelente' },
      2: { emoji: '+', label: 'Boa' },
      1: { emoji: '-', label: 'Fraca' },
      0: { emoji: '✗', label: 'Má' },
    };

    const finalPhases = rallies.reduce((acc, rally) => {
      const key = `${rally.match_id}-${rally.set_no}-${rally.rally_no}`;
      if (!acc[key] || rally.phase > acc[key].phase) {
        acc[key] = rally;
      }
      return acc;
    }, {} as Record<string, Rally>);

    const byReception: Record<number, { count: number; destinations: Record<string, number> }> = {};

    Object.values(finalPhases).forEach(rally => {
      if (!rally.setter_player_id || !rally.pass_destination) return;
      
      const rCode = rally.r_code ?? 0;
      const dest = rally.pass_destination;

      if (!byReception[rCode]) {
        byReception[rCode] = { count: 0, destinations: {} };
      }
      byReception[rCode].count++;
      byReception[rCode].destinations[dest] = (byReception[rCode].destinations[dest] || 0) + 1;
    });

    return [3, 2, 1, 0].map(rCode => {
      const data = byReception[rCode] || { count: 0, destinations: {} };
      const info = RECEPTION_INFO[rCode];
      const available = POSITIONS_BY_RECEPTION[rCode] || [];

      const destRecord: Record<PassDestination | 'OUTROS', number> = {
        P2: 0, P3: 0, P4: 0, OP: 0, PIPE: 0, BACK: 0, OUTROS: 0
      };
      Object.entries(data.destinations).forEach(([key, value]) => {
        destRecord[key as PassDestination | 'OUTROS'] = value;
      });

      const topDests = Object.entries(data.destinations)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([dest, count]) => `${dest} (${count})`)
        .join(' | ');

      return {
        receptionCode: rCode,
        qualityLabel: info.label,
        emoji: info.emoji,
        availableCount: available.length,
        totalRallies: data.count,
        destinations: destRecord,
        topDestinations: topDests || '-',
      };
    });
  }, [rallies]);

  // Team defense stats - kills suffered by each team (defensive perspective)
  const teamDefenseStats = useMemo((): TeamDefenseStats[] => {
    // Group rallies by match_id to get team names for each side
    const teamStatsMap: Record<string, TeamDefenseStats> = {};

    // Get final phases only
    const finalPhases = rallies.reduce((acc, rally) => {
      const key = `${rally.match_id}-${rally.set_no}-${rally.rally_no}`;
      if (!acc[key] || rally.phase > acc[key].phase) {
        acc[key] = rally;
      }
      return acc;
    }, {} as Record<string, Rally>);

    // Initialize team stats based on matches
    matches.forEach(match => {
      const homeKey = `${match.id}-CASA`;
      const awayKey = `${match.id}-FORA`;
      
      if (!teamStatsMap[match.home_name]) {
        teamStatsMap[match.home_name] = {
          teamName: match.home_name,
          side: 'CASA',
          killsSuffered: 0,
          floorKillsSuffered: 0,
          blockoutKillsSuffered: 0,
          floorPct: 0,
          blockoutPct: 0,
        };
      }
      if (!teamStatsMap[match.away_name]) {
        teamStatsMap[match.away_name] = {
          teamName: match.away_name,
          side: 'FORA',
          killsSuffered: 0,
          floorKillsSuffered: 0,
          blockoutKillsSuffered: 0,
          floorPct: 0,
          blockoutPct: 0,
        };
      }
    });

    // Process rallies to count kills suffered
    Object.values(finalPhases).forEach(rally => {
      if (rally.reason === 'KILL' && rally.point_won_by) {
        const match = matches.find(m => m.id === rally.match_id);
        if (!match) return;

        // The team that lost the point is the one who suffered the kill
        const loserTeamName = rally.point_won_by === 'CASA' ? match.away_name : match.home_name;
        
        if (teamStatsMap[loserTeamName]) {
          teamStatsMap[loserTeamName].killsSuffered++;
          
          if (rally.kill_type === 'FLOOR') {
            teamStatsMap[loserTeamName].floorKillsSuffered++;
          } else if (rally.kill_type === 'BLOCKOUT') {
            teamStatsMap[loserTeamName].blockoutKillsSuffered++;
          }
        }
      }
    });

    // Calculate percentages
    Object.values(teamStatsMap).forEach(team => {
      if (team.killsSuffered > 0) {
        team.floorPct = (team.floorKillsSuffered / team.killsSuffered) * 100;
        team.blockoutPct = (team.blockoutKillsSuffered / team.killsSuffered) * 100;
      }
    });

    return Object.values(teamStatsMap).filter(t => t.killsSuffered > 0);
  }, [rallies, matches]);

  return {
    loading,
    summary,
    playerStats,
    setterStats,
    topAttackers,
    topReceivers,
    topServers,
    topBlockers,
    topSetters,
    teamDefenseStats,
    setterDistributionStats,
    globalReceptionBreakdown,
  };
}
