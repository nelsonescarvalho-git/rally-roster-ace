import { useMemo } from 'react';
import { Rally, Player, MatchPlayer, Side, ATTACK_DIFFICULTY_BY_DISTRIBUTION, DISTRIBUTION_LABELS, AttackDirection, ATTACK_DIRECTION_LABELS } from '@/types/volleyball';
import type { RallyActionWithPlayer } from '@/types/rallyActions';

export interface AttackerStats {
  attackerId: string;
  attackerName: string;
  jerseyNumber: number;
  side: Side;
  totalAttempts: number;
  totalKills: number;
  totalErrors: number;
  totalBlocked: number;
  efficiency: number;
  avgDistributionQuality: number;
  killsWithGoodDist: number;
  killsWithBadDist: number;
  attemptsWithGoodDist: number;
  attemptsWithBadDist: number;
  efficiencyWithGoodDist: number;
  efficiencyWithBadDist: number;
  statsByDistribution: {
    distributionCode: number;
    attempts: number;
    kills: number;
    errors: number;
    blocked: number;
    efficiency: number;
  }[];
  statsByDirection: {
    direction: AttackDirection;
    attempts: number;
    kills: number;
    errors: number;
    efficiency: number;
  }[];
  preferredDirection: AttackDirection | null;
  bestDirection: AttackDirection | null;
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
  attackDirection?: AttackDirection | null;
}

interface AttackEvent {
  attackerId: string;
  aCode: number;
  passCode: number;
  direction: string | null;
  killType: string | null;
  // For blocked detection
  isBlocked: boolean;
}

export function useAttackStats(
  rallies: Rally[],
  players: (Player | MatchPlayer)[],
  filters?: AttackFilters,
  rallyActionsMap?: Map<string, RallyActionWithPlayer[]>
) {
  const attackers = useMemo(() => {
    return players.filter(p => {
      const position = p.position?.toUpperCase();
      return !position || position !== 'L';
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

    // Collect all attack events from rally_actions or flat rallies
    const attackEvents: AttackEvent[] = [];

    Object.values(finalPhases).forEach(rally => {
      const actions = rallyActionsMap?.get(rally.id);

      if (actions && actions.length > 0) {
        // Use rally_actions: iterate ALL attack actions
        const attackActions = actions.filter(a => a.action_type === 'attack' && a.code !== null && a.code !== -1 && a.player_id);
        
        for (const attackAction of attackActions) {
          // Find preceding setter action from same side for pass quality
          const setterAction = actions
            .filter(a => a.action_type === 'setter' && a.side === attackAction.side && a.sequence_no < attackAction.sequence_no)
            .pop(); // last setter before this attack
          
          const passCode = attackAction.pass_code ?? setterAction?.pass_code ?? setterAction?.code ?? 2;

          // Check if blocked for point
          const blockAfter = actions.find(a =>
            a.action_type === 'block' &&
            a.sequence_no > attackAction.sequence_no &&
            a.side !== attackAction.side &&
            a.code === 3
          );

          attackEvents.push({
            attackerId: attackAction.player_id!,
            aCode: attackAction.code!,
            passCode,
            direction: attackAction.attack_direction,
            killType: attackAction.kill_type,
            isBlocked: attackAction.code === 1 && !!blockAfter,
          });
        }
      } else {
        // Fallback: flat rally fields
        if (rally.a_player_id && rally.a_code !== null) {
          const passCode = rally.a_pass_quality ?? rally.pass_code ?? 2;
          attackEvents.push({
            attackerId: rally.a_player_id,
            aCode: rally.a_code,
            passCode,
            direction: rally.attack_direction,
            killType: rally.kill_type,
            isBlocked: rally.a_code === 1 && rally.b_code === 3,
          });
        }
      }
    });

    // Apply filters
    let filteredEvents = attackEvents;

    if (filters?.side && filters.side !== 'TODAS') {
      filteredEvents = filteredEvents.filter(e => {
        const attacker = players.find(p => p.id === e.attackerId);
        return attacker?.side === filters.side;
      });
    }
    if (filters?.attackerId) {
      filteredEvents = filteredEvents.filter(e => e.attackerId === filters.attackerId);
    }
    if (filters?.distributionCode !== null && filters?.distributionCode !== undefined) {
      filteredEvents = filteredEvents.filter(e => e.passCode === filters.distributionCode);
    }
    if (filters?.attackDirection) {
      filteredEvents = filteredEvents.filter(e => e.direction === filters.attackDirection);
    }

    // Build attacker stats
    const statsMap: Record<string, {
      stats: AttackerStats;
      passCodeSum: number;
      byDistribution: Record<number, { attempts: number; kills: number; errors: number; blocked: number }>;
      byDirection: Record<string, { attempts: number; kills: number; errors: number }>;
    }> = {};

    attackers.forEach(p => {
      if (!statsMap[p.id]) {
        statsMap[p.id] = {
          stats: {
            attackerId: p.id,
            attackerName: p.name,
            jerseyNumber: p.jersey_number,
            side: p.side as Side,
            totalAttempts: 0, totalKills: 0, totalErrors: 0, totalBlocked: 0, efficiency: 0,
            avgDistributionQuality: 0,
            killsWithGoodDist: 0, killsWithBadDist: 0,
            attemptsWithGoodDist: 0, attemptsWithBadDist: 0,
            efficiencyWithGoodDist: 0, efficiencyWithBadDist: 0,
            statsByDistribution: [], statsByDirection: [],
            preferredDirection: null, bestDirection: null,
          },
          passCodeSum: 0,
          byDistribution: { 0: { attempts: 0, kills: 0, errors: 0, blocked: 0 }, 1: { attempts: 0, kills: 0, errors: 0, blocked: 0 }, 2: { attempts: 0, kills: 0, errors: 0, blocked: 0 }, 3: { attempts: 0, kills: 0, errors: 0, blocked: 0 } },
          byDirection: {},
        };
      }
    });

    const globalByDist: Record<number, { attempts: number; kills: number; errors: number; attackers: Record<string, number> }> = {
      0: { attempts: 0, kills: 0, errors: 0, attackers: {} },
      1: { attempts: 0, kills: 0, errors: 0, attackers: {} },
      2: { attempts: 0, kills: 0, errors: 0, attackers: {} },
      3: { attempts: 0, kills: 0, errors: 0, attackers: {} },
    };

    // Process events
    filteredEvents.forEach(event => {
      if (!statsMap[event.attackerId]) return;

      const entry = statsMap[event.attackerId];
      entry.stats.totalAttempts++;
      entry.passCodeSum += event.passCode;

      if (event.aCode === 3) entry.stats.totalKills++;
      if (event.aCode === 0) entry.stats.totalErrors++;
      if (event.isBlocked) entry.stats.totalBlocked++;

      // By distribution quality
      const pc = event.passCode;
      if (!entry.byDistribution[pc]) {
        entry.byDistribution[pc] = { attempts: 0, kills: 0, errors: 0, blocked: 0 };
      }
      entry.byDistribution[pc].attempts++;
      if (event.aCode === 3) entry.byDistribution[pc].kills++;
      if (event.aCode === 0) entry.byDistribution[pc].errors++;
      if (event.isBlocked) entry.byDistribution[pc].blocked++;

      if (pc >= 2) {
        entry.stats.attemptsWithGoodDist++;
        if (event.aCode === 3) entry.stats.killsWithGoodDist++;
      } else {
        entry.stats.attemptsWithBadDist++;
        if (event.aCode === 3) entry.stats.killsWithBadDist++;
      }

      if (event.direction) {
        if (!entry.byDirection[event.direction]) {
          entry.byDirection[event.direction] = { attempts: 0, kills: 0, errors: 0 };
        }
        entry.byDirection[event.direction].attempts++;
        if (event.aCode === 3) entry.byDirection[event.direction].kills++;
        if (event.aCode === 0) entry.byDirection[event.direction].errors++;
      }

      if (!globalByDist[pc]) {
        globalByDist[pc] = { attempts: 0, kills: 0, errors: 0, attackers: {} };
      }
      globalByDist[pc].attempts++;
      if (event.aCode === 3) {
        globalByDist[pc].kills++;
        const attacker = players.find(p => p.id === event.attackerId);
        if (attacker) {
          const key = `#${attacker.jersey_number}`;
          globalByDist[pc].attackers[key] = (globalByDist[pc].attackers[key] || 0) + 1;
        }
      }
      if (event.aCode === 0) globalByDist[pc].errors++;
    });

    // Calculate final stats
    Object.values(statsMap).forEach(entry => {
      const s = entry.stats;
      if (s.totalAttempts > 0) {
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
          efficiency: d.attempts > 0 ? (d.kills - d.errors - d.blocked) / d.attempts : 0,
        };
      });

      const directions: AttackDirection[] = ['DIAGONAL', 'LINE', 'TIP', 'Z1', 'Z5'];
      s.statsByDirection = directions
        .map(dir => {
          const d = entry.byDirection[dir] || { attempts: 0, kills: 0, errors: 0 };
          return {
            direction: dir,
            attempts: d.attempts,
            kills: d.kills,
            errors: d.errors,
            efficiency: d.attempts > 0 ? (d.kills - d.errors) / d.attempts : 0,
          };
        })
        .filter(d => d.attempts > 0);

      if (s.statsByDirection.length > 0) {
        s.preferredDirection = s.statsByDirection.reduce((a, b) => a.attempts >= b.attempts ? a : b).direction;
        const eligible = s.statsByDirection.filter(d => d.attempts >= 2);
        s.bestDirection = eligible.length > 0
          ? eligible.reduce((a, b) => a.efficiency >= b.efficiency ? a : b).direction
          : s.preferredDirection;
      }
    });

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
  }, [rallies, players, attackers, filters, rallyActionsMap]);

  return {
    attackerStats,
    attackers: attackers.filter(a => attackerStats.some(s => s.attackerId === a.id)),
    globalDistributionBreakdown,
  };
}
