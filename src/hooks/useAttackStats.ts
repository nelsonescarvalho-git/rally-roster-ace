import { useMemo } from 'react';
import { Rally, Player, MatchPlayer, Side, ATTACK_DIFFICULTY_BY_DISTRIBUTION, DISTRIBUTION_LABELS } from '@/types/volleyball';

export interface AttackerStats {
  attackerId: string;
  attackerName: string;
  jerseyNumber: number;
  side: Side;
  
  // Total stats
  totalAttempts: number;
  totalKills: number;
  totalErrors: number;
  totalBlocked: number; // Blocked for point (a_code=1 AND b_code=3)
  efficiency: number;
  
  // New metrics by distribution quality
  avgDistributionQuality: number;
  killsWithGoodDist: number;
  killsWithBadDist: number;
  attemptsWithGoodDist: number;
  attemptsWithBadDist: number;
  efficiencyWithGoodDist: number;
  efficiencyWithBadDist: number;
  
  // Breakdown by distribution quality
  statsByDistribution: {
    distributionCode: number;
    attempts: number;
    kills: number;
    errors: number;
    blocked: number;
    efficiency: number;
  }[];
}

export interface DistributionBreakdown {
  distributionCode: number;
  emoji: string;
  qualityLabel: string;
  difficulty: string;
  expectedKillRate: number;
  totalAttempts: number;
  totalKills: number;
  totalErrors: number;
  killRate: number;
  topAttackers: string;
}

interface AttackFilters {
  side?: Side | 'TODAS';
  attackerId?: string | null;
  distributionCode?: number | null;
}

export function useAttackStats(
  rallies: Rally[],
  players: (Player | MatchPlayer)[],
  filters?: AttackFilters
) {
  const attackers = useMemo(() => {
    return players.filter(p => {
      const position = p.position?.toUpperCase();
      // Include all players who have attacks, or typical attackers
      return !position || position !== 'L'; // Exclude liberos
    });
  }, [players]);

  const { attackerStats, globalDistributionBreakdown } = useMemo(() => {
    // Get final phases only
    const finalPhases = rallies.reduce((acc, rally) => {
      const key = `${rally.match_id}-${rally.set_no}-${rally.rally_no}`;
      if (!acc[key] || rally.phase > acc[key].phase) {
        acc[key] = rally;
      }
      return acc;
    }, {} as Record<string, Rally>);

    // Apply filters
    let filteredRallies = Object.values(finalPhases).filter(r => r.a_player_id && r.a_code !== null);
    
    if (filters?.side && filters.side !== 'TODAS') {
      filteredRallies = filteredRallies.filter(r => {
        const attacker = players.find(p => p.id === r.a_player_id);
        return attacker?.side === filters.side;
      });
    }
    
    if (filters?.attackerId) {
      filteredRallies = filteredRallies.filter(r => r.a_player_id === filters.attackerId);
    }
    
    if (filters?.distributionCode !== null && filters?.distributionCode !== undefined) {
      filteredRallies = filteredRallies.filter(r => r.pass_code === filters.distributionCode);
    }

    // Build attacker stats
    const statsMap: Record<string, {
      stats: AttackerStats;
      passCodeSum: number;
      byDistribution: Record<number, { attempts: number; kills: number; errors: number; blocked: number }>;
    }> = {};

    // Initialize for all attackers
    attackers.forEach(p => {
      if (!statsMap[p.id]) {
        statsMap[p.id] = {
          stats: {
            attackerId: p.id,
            attackerName: p.name,
            jerseyNumber: p.jersey_number,
            side: p.side as Side,
            totalAttempts: 0,
            totalKills: 0,
            totalErrors: 0,
            totalBlocked: 0,
            efficiency: 0,
            avgDistributionQuality: 0,
            killsWithGoodDist: 0,
            killsWithBadDist: 0,
            attemptsWithGoodDist: 0,
            attemptsWithBadDist: 0,
            efficiencyWithGoodDist: 0,
            efficiencyWithBadDist: 0,
            statsByDistribution: [],
          },
          passCodeSum: 0,
          byDistribution: { 0: { attempts: 0, kills: 0, errors: 0, blocked: 0 }, 1: { attempts: 0, kills: 0, errors: 0, blocked: 0 }, 2: { attempts: 0, kills: 0, errors: 0, blocked: 0 }, 3: { attempts: 0, kills: 0, errors: 0, blocked: 0 } },
        };
      }
    });

    // Global distribution breakdown
    const globalByDist: Record<number, { attempts: number; kills: number; errors: number; attackers: Record<string, number> }> = {
      0: { attempts: 0, kills: 0, errors: 0, attackers: {} },
      1: { attempts: 0, kills: 0, errors: 0, attackers: {} },
      2: { attempts: 0, kills: 0, errors: 0, attackers: {} },
      3: { attempts: 0, kills: 0, errors: 0, attackers: {} },
    };

    // Process rallies
    filteredRallies.forEach(rally => {
      const attackerId = rally.a_player_id!;
      const aCode = rally.a_code!;
      // Use a_pass_quality if available, fallback to pass_code, then default to 2
      const passCode = rally.a_pass_quality ?? rally.pass_code ?? 2;
      
      if (!statsMap[attackerId]) return;
      
      const entry = statsMap[attackerId];
      entry.stats.totalAttempts++;
      entry.passCodeSum += passCode;
      
      if (aCode === 3) entry.stats.totalKills++;
      if (aCode === 0) entry.stats.totalErrors++;
      // SEMANTIC CORRECTION: blocked for point = a_code=1 AND b_code=3
      if (aCode === 1 && rally.b_code === 3) entry.stats.totalBlocked++;

      // By distribution quality
      if (!entry.byDistribution[passCode]) {
        entry.byDistribution[passCode] = { attempts: 0, kills: 0, errors: 0, blocked: 0 };
      }
      entry.byDistribution[passCode].attempts++;
      if (aCode === 3) entry.byDistribution[passCode].kills++;
      if (aCode === 0) entry.byDistribution[passCode].errors++;
      if (aCode === 1 && rally.b_code === 3) entry.byDistribution[passCode].blocked++;

      // Good dist (>= 2) vs Bad dist (<= 1)
      if (passCode >= 2) {
        entry.stats.attemptsWithGoodDist++;
        if (aCode === 3) entry.stats.killsWithGoodDist++;
      } else {
        entry.stats.attemptsWithBadDist++;
        if (aCode === 3) entry.stats.killsWithBadDist++;
      }

      // Global breakdown
      if (!globalByDist[passCode]) {
        globalByDist[passCode] = { attempts: 0, kills: 0, errors: 0, attackers: {} };
      }
      globalByDist[passCode].attempts++;
      if (aCode === 3) {
        globalByDist[passCode].kills++;
        const attacker = players.find(p => p.id === attackerId);
        if (attacker) {
          const key = `#${attacker.jersey_number}`;
          globalByDist[passCode].attackers[key] = (globalByDist[passCode].attackers[key] || 0) + 1;
        }
      }
      if (aCode === 0) globalByDist[passCode].errors++;
    });

    // Calculate final stats
    Object.values(statsMap).forEach(entry => {
      const s = entry.stats;
      if (s.totalAttempts > 0) {
        // Correct efficiency: (kills - errors - blocked_point) / total
        s.efficiency = (s.totalKills - s.totalErrors - s.totalBlocked) / s.totalAttempts;
        s.avgDistributionQuality = entry.passCodeSum / s.totalAttempts;
      }
      if (s.attemptsWithGoodDist > 0) {
        const errorsWithGood = [3, 2].reduce((sum, code) => sum + (entry.byDistribution[code]?.errors || 0), 0);
        const blockedWithGood = [3, 2].reduce((sum, code) => sum + (entry.byDistribution[code]?.blocked || 0), 0);
        s.efficiencyWithGoodDist = (s.killsWithGoodDist - errorsWithGood - blockedWithGood) / s.attemptsWithGoodDist;
      }
      if (s.attemptsWithBadDist > 0) {
        const errorsWithBad = [1, 0].reduce((sum, code) => sum + (entry.byDistribution[code]?.errors || 0), 0);
        const blockedWithBad = [1, 0].reduce((sum, code) => sum + (entry.byDistribution[code]?.blocked || 0), 0);
        s.efficiencyWithBadDist = (s.killsWithBadDist - errorsWithBad - blockedWithBad) / s.attemptsWithBadDist;
      }
      
      s.statsByDistribution = [3, 2, 1, 0].map(code => {
        const d = entry.byDistribution[code] || { attempts: 0, kills: 0, errors: 0, blocked: 0 };
        return {
          distributionCode: code,
          attempts: d.attempts,
          kills: d.kills,
          errors: d.errors,
          blocked: d.blocked,
          // Correct efficiency per distribution: (kills - errors - blocked) / attempts
          efficiency: d.attempts > 0 ? (d.kills - d.errors - d.blocked) / d.attempts : 0,
        };
      });
    });

    // Build global breakdown
    const breakdown: DistributionBreakdown[] = [3, 2, 1, 0].map(code => {
      const data = globalByDist[code];
      const info = ATTACK_DIFFICULTY_BY_DISTRIBUTION[code];
      
      const topAttackers = Object.entries(data.attackers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, kills]) => `${name}(${kills})`)
        .join(', ');

      return {
        distributionCode: code,
        emoji: info.emoji,
        qualityLabel: info.label,
        difficulty: info.difficulty,
        expectedKillRate: info.expectedKillRate,
        totalAttempts: data.attempts,
        totalKills: data.kills,
        totalErrors: data.errors,
        killRate: data.attempts > 0 ? data.kills / data.attempts : 0,
        topAttackers: topAttackers || '-',
      };
    });

    return {
      attackerStats: Object.values(statsMap)
        .map(e => e.stats)
        .filter(s => s.totalAttempts > 0)
        .sort((a, b) => b.efficiency - a.efficiency),
      globalDistributionBreakdown: breakdown,
    };
  }, [rallies, players, attackers, filters]);

  return {
    attackerStats,
    attackers: attackers.filter(a => attackerStats.some(s => s.attackerId === a.id)),
    globalDistributionBreakdown,
  };
}
