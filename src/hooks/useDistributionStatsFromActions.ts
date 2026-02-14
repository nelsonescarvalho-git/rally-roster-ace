import { useMemo } from 'react';
import { Player, MatchPlayer, Side, PassDestination, POSITIONS_BY_RECEPTION } from '@/types/volleyball';
import { RallyActionWithPlayer } from '@/types/rallyActions';

export interface ReceptionBreakdown {
  receptionCode: number;
  qualityLabel: string;
  emoji: string;
  availableCount: number;
  totalRallies: number;
  destinations: Record<PassDestination | 'OUTROS', number>;
  topDestinations: string;
}

export interface SetterDistribution {
  setterId: string;
  setterName: string;
  jerseyNumber: number;
  side: Side;
  destinations: Record<PassDestination | 'OUTROS', number>;
  total: number;
  preference: string;
  top2: string;
  avgAvailablePositions: number;
  usedWithinAvailable: number;
  destinationsByReception: ReceptionBreakdown[];
}

const DESTINATIONS: (PassDestination | 'OUTROS')[] = ['P2', 'P3', 'P4', 'OP', 'PIPE', 'BACK', 'OUTROS'];

const RECEPTION_INFO: Record<number, { emoji: string; label: string }> = {
  3: { emoji: '⭐', label: 'Excelente' },
  2: { emoji: '+', label: 'Boa' },
  1: { emoji: '-', label: 'Fraca' },
  0: { emoji: '✗', label: 'Má' },
};

/**
 * Hook to calculate distribution statistics from rally_actions table.
 * This reads ALL setter actions including counter-attacks, providing accurate
 * distribution data per team based on action.side rather than rally.recv_side.
 */
export function useDistributionStatsFromActions(
  rallyActionsMap: Map<string, RallyActionWithPlayer[]> | undefined,
  players: (Player | MatchPlayer)[],
  filters: {
    side: Side | 'TODAS';
    setterId: string | null;
    receptionCode?: number | null;
  }
) {
  // Flatten all actions into a single array with rally context
  const allSetterActions = useMemo(() => {
    if (!rallyActionsMap) return [];
    
    const result: Array<{
      action: RallyActionWithPlayer;
      rallyId: string;
      receptionCode: number | null;
    }> = [];
    
    rallyActionsMap.forEach((actions, rallyId) => {
      // For each rally, find setter actions and correlate with reception quality
      const setterActions = actions.filter(a => a.action_type === 'setter' && a.pass_destination && a.player_id);
      
      setterActions.forEach(setterAction => {
        // Find the reception that precedes this setter in the same side's sequence
        // Look backwards from the setter to find the most recent reception on the same side
        const setterSeq = setterAction.sequence_no;
        let receptionCode: number | null = null;
        
        // Find receptions before this setter
        const precedingReceptions = actions
          .filter(a => 
            a.action_type === 'reception' && 
            a.sequence_no < setterSeq &&
            a.side === setterAction.side
          )
          .sort((a, b) => b.sequence_no - a.sequence_no);
        
        if (precedingReceptions.length > 0) {
          receptionCode = precedingReceptions[0].code;
        } else {
          // For counter-attacks, look for defense preceding the setter
          const precedingDefense = actions
            .filter(a => 
              a.action_type === 'defense' && 
              a.sequence_no < setterSeq &&
              a.side === setterAction.side
            )
            .sort((a, b) => b.sequence_no - a.sequence_no);
          
          if (precedingDefense.length > 0) {
            receptionCode = precedingDefense[0].code;
          }
        }
        
        result.push({
          action: setterAction,
          rallyId,
          receptionCode,
        });
      });
    });
    
    return result;
  }, [rallyActionsMap]);

  const distributionStats = useMemo(() => {
    let validActions = allSetterActions;

    // Apply side filter based on action.side
    if (filters.side !== 'TODAS') {
      validActions = validActions.filter(a => a.action.side === filters.side);
    }

    // Apply setter filter
    if (filters.setterId) {
      validActions = validActions.filter(a => a.action.player_id === filters.setterId);
    }

    // Apply reception code filter
    if (filters.receptionCode !== undefined && filters.receptionCode !== null) {
      validActions = validActions.filter(a => a.receptionCode === filters.receptionCode);
    }

    // Group by setter
    const setterStats: Record<string, SetterDistribution> = {};

    validActions.forEach(({ action, receptionCode }) => {
      const setterId = action.player_id || 'unknown';
      const destination = action.pass_destination as PassDestination | 'OUTROS';

      // Find setter player info
      const setter = players.find(p => p.id === setterId);
      const setterName = setter?.name || action.player_name || 'Desconhecido';
      const jerseyNumber = setter?.jersey_number || action.player_jersey || 0;
      const side = (action.side as Side) || 'CASA';

      if (!setterStats[setterId]) {
        setterStats[setterId] = {
          setterId,
          setterName,
          jerseyNumber,
          side,
          destinations: { P2: 0, P3: 0, P4: 0, OP: 0, PIPE: 0, BACK: 0, OUTROS: 0 },
          total: 0,
          preference: '-',
          top2: '-',
          avgAvailablePositions: 0,
          usedWithinAvailable: 0,
          destinationsByReception: [],
        };
      }

      const validDest = DESTINATIONS.includes(destination) ? destination : 'OUTROS';
      setterStats[setterId].destinations[validDest]++;
      setterStats[setterId].total++;
    });

    // Calculate preference, top2, and reception-based metrics
    Object.values(setterStats).forEach(stat => {
      if (stat.total === 0) return;

      const sorted = DESTINATIONS
        .map(dest => ({ dest, count: stat.destinations[dest], pct: (stat.destinations[dest] / stat.total) * 100 }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count);

      if (sorted.length > 0) {
        stat.preference = sorted[0].dest;
        stat.top2 = sorted.slice(0, 2).map(d => `${d.dest} ${d.pct.toFixed(0)}%`).join(' | ');
      }

      // Get setter's actions for detailed metrics
      const setterActions = validActions.filter(a => a.action.player_id === stat.setterId);
      
      let totalAvailable = 0;
      let usedWithinAvailableCount = 0;
      const byReception: Record<number, { count: number; destinations: Record<string, number> }> = {};

      setterActions.forEach(({ action, receptionCode }) => {
        const rCode = receptionCode ?? 0;
        const dest = action.pass_destination as PassDestination;
        const availablePositions = POSITIONS_BY_RECEPTION[rCode] || POSITIONS_BY_RECEPTION[0];

        totalAvailable += availablePositions.length;

        if (availablePositions.includes(dest)) {
          usedWithinAvailableCount++;
        }

        if (!byReception[rCode]) {
          byReception[rCode] = { count: 0, destinations: {} };
        }
        byReception[rCode].count++;
        byReception[rCode].destinations[dest] = (byReception[rCode].destinations[dest] || 0) + 1;
      });

      stat.avgAvailablePositions = setterActions.length > 0
        ? totalAvailable / setterActions.length
        : 0;

      stat.usedWithinAvailable = setterActions.length > 0
        ? (usedWithinAvailableCount / setterActions.length) * 100
        : 0;

      // Build destinationsByReception
      stat.destinationsByReception = [3, 2, 1, 0].map(rCode => {
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
    });

    // Sort by side and name
    return Object.values(setterStats).sort((a, b) => {
      if (a.side !== b.side) return a.side === 'CASA' ? -1 : 1;
      return a.setterName.localeCompare(b.setterName);
    });
  }, [allSetterActions, players, filters.side, filters.setterId, filters.receptionCode]);

  // Get unique setters for filter dropdown
  const setters = useMemo(() => {
    const setterMap = new Map<string, { id: string; name: string; jerseyNumber: number; side: Side }>();

    allSetterActions.forEach(({ action }) => {
      const setterId = action.player_id;
      if (!setterId || setterMap.has(setterId)) return;

      const setter = players.find(p => p.id === setterId);
      setterMap.set(setterId, {
        id: setterId,
        name: setter?.name || action.player_name || 'Desconhecido',
        jerseyNumber: setter?.jersey_number || action.player_jersey || 0,
        side: (action.side as Side) || 'CASA',
      });
    });

    return Array.from(setterMap.values());
  }, [allSetterActions, players]);

  // Global reception breakdown across all setters (for global view)
  const globalReceptionBreakdown = useMemo((): ReceptionBreakdown[] => {
    let validActions = allSetterActions;

    // Apply side filter
    if (filters.side !== 'TODAS') {
      validActions = validActions.filter(a => a.action.side === filters.side);
    }

    // Apply setter filter
    if (filters.setterId) {
      validActions = validActions.filter(a => a.action.player_id === filters.setterId);
    }

    const byReception: Record<number, { count: number; destinations: Record<string, number> }> = {};

    validActions.forEach(({ action, receptionCode }) => {
      const rCode = receptionCode ?? 0;
      const dest = action.pass_destination as PassDestination;

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
  }, [allSetterActions, filters.side, filters.setterId]);

  // Count incomplete distributions (setter actions without destination)
  const incompleteDistributionCount = useMemo(() => {
    if (!rallyActionsMap) return 0;
    
    let count = 0;
    rallyActionsMap.forEach((actions) => {
      const incompleteSetters = actions.filter(a => 
        a.action_type === 'setter' && 
        !a.pass_destination &&
        (filters.side === 'TODAS' || a.side === filters.side)
      );
      count += incompleteSetters.length;
    });
    
    return count;
  }, [rallyActionsMap, filters.side]);

  return { 
    distributionStats, 
    setters, 
    destinations: DESTINATIONS, 
    globalReceptionBreakdown, 
    incompleteDistributionCount 
  };
}
