import { useMemo } from 'react';
import { Rally, Player, MatchPlayer, Side, PassDestination, POSITIONS_BY_RECEPTION } from '@/types/volleyball';

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
  // New metrics
  avgAvailablePositions: number;
  usedWithinAvailable: number; // percentage
  destinationsByReception: ReceptionBreakdown[];
}

const DESTINATIONS: (PassDestination | 'OUTROS')[] = ['P2', 'P3', 'P4', 'OP', 'PIPE', 'BACK', 'OUTROS'];

const RECEPTION_INFO: Record<number, { emoji: string; label: string }> = {
  3: { emoji: '⭐', label: 'Excelente' },
  2: { emoji: '+', label: 'Boa' },
  1: { emoji: '-', label: 'Fraca' },
  0: { emoji: '✗', label: 'Má' },
};

export function useDistributionStats(
  rallies: Rally[],
  players: (Player | MatchPlayer)[],
  filters: {
    side: Side | 'TODAS';
    setterId: string | null;
    receptionCode?: number | null;
  }
) {
  const distributionStats = useMemo(() => {
    // Get final phases only
    const finalPhases = rallies.reduce((acc, rally) => {
      const key = `${rally.set_no}-${rally.rally_no}`;
      if (!acc[key] || rally.phase > acc[key].phase) {
        acc[key] = rally;
      }
      return acc;
    }, {} as Record<string, Rally>);

    // Filter rallies with setter and destination
    const ralliesWithSetter = Object.values(finalPhases).filter(
      r => r.setter_player_id
    );
    
    // Split into complete (with destination) and incomplete (no destination)
    let validRallies = ralliesWithSetter.filter(r => r.pass_destination);
    const incompleteRallies = ralliesWithSetter.filter(r => !r.pass_destination);
    const incompleteDistributionCount = incompleteRallies.length;

    // Apply reception code filter if set
    if (filters.receptionCode !== undefined && filters.receptionCode !== null) {
      validRallies = validRallies.filter(r => r.r_code === filters.receptionCode);
    }

    // Group by setter
    const setterStats: Record<string, SetterDistribution> = {};

    validRallies.forEach(rally => {
      const setterId = rally.setter_player_id!;
      const destination = rally.pass_destination as PassDestination | 'OUTROS';
      const receptionCode = rally.r_code ?? 0;
      
      // Find setter player info
      const setter = players.find(p => p.id === setterId);
      if (!setter) return;

      // Apply side filter
      if (filters.side !== 'TODAS' && setter.side !== filters.side) return;
      
      // Apply setter filter
      if (filters.setterId && setterId !== filters.setterId) return;

      if (!setterStats[setterId]) {
        setterStats[setterId] = {
          setterId,
          setterName: setter.name,
          jerseyNumber: setter.jersey_number,
          side: setter.side as Side,
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

    // Calculate preference, top2, and new metrics
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

      // Calculate reception-based metrics for this setter
      const setterRallies = validRallies.filter(r => r.setter_player_id === stat.setterId);
      
      let totalAvailable = 0;
      let usedWithinAvailableCount = 0;
      
      // Group by reception code
      const byReception: Record<number, { count: number; destinations: Record<string, number> }> = {};
      
      setterRallies.forEach(rally => {
        const rCode = rally.r_code ?? 0;
        const dest = rally.pass_destination as PassDestination;
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
      
      stat.avgAvailablePositions = setterRallies.length > 0 
        ? totalAvailable / setterRallies.length 
        : 0;
      
      stat.usedWithinAvailable = setterRallies.length > 0 
        ? (usedWithinAvailableCount / setterRallies.length) * 100 
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
        
        // Calculate top destinations
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
  }, [rallies, players, filters.side, filters.setterId, filters.receptionCode]);

  // Get unique setters for filter dropdown
  const setters = useMemo(() => {
    const setterIds = new Set<string>();
    
    rallies.forEach(rally => {
      if (rally.setter_player_id && rally.pass_destination) {
        setterIds.add(rally.setter_player_id);
      }
    });

    return players
      .filter(p => setterIds.has(p.id))
      .map(p => ({ id: p.id, name: p.name, jerseyNumber: p.jersey_number, side: p.side as Side }));
  }, [rallies, players]);

  // Aggregate reception breakdown across all setters (for global view)
  const globalReceptionBreakdown = useMemo((): ReceptionBreakdown[] => {
    // Get final phases only
    const finalPhases = rallies.reduce((acc, rally) => {
      const key = `${rally.set_no}-${rally.rally_no}`;
      if (!acc[key] || rally.phase > acc[key].phase) {
        acc[key] = rally;
      }
      return acc;
    }, {} as Record<string, Rally>);

    let validRallies = Object.values(finalPhases).filter(
      r => r.setter_player_id && r.pass_destination
    );

    // Apply side filter
    if (filters.side !== 'TODAS') {
      validRallies = validRallies.filter(r => {
        const setter = players.find(p => p.id === r.setter_player_id);
        return setter && setter.side === filters.side;
      });
    }

    // Apply setter filter
    if (filters.setterId) {
      validRallies = validRallies.filter(r => r.setter_player_id === filters.setterId);
    }

    const byReception: Record<number, { count: number; destinations: Record<string, number> }> = {};

    validRallies.forEach(rally => {
      const rCode = rally.r_code ?? 0;
      const dest = rally.pass_destination as PassDestination;

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
  }, [rallies, players, filters.side, filters.setterId]);

  // Count incomplete distributions (setter but no destination)
  const incompleteDistributionCount = useMemo(() => {
    const finalPhases = rallies.reduce((acc, rally) => {
      const key = `${rally.set_no}-${rally.rally_no}`;
      if (!acc[key] || rally.phase > acc[key].phase) {
        acc[key] = rally;
      }
      return acc;
    }, {} as Record<string, Rally>);

    const ralliesWithSetter = Object.values(finalPhases).filter(
      r => r.setter_player_id && !r.pass_destination
    );

    // Apply side filter
    if (filters.side !== 'TODAS') {
      return ralliesWithSetter.filter(r => {
        const setter = players.find(p => p.id === r.setter_player_id);
        return setter && setter.side === filters.side;
      }).length;
    }

    return ralliesWithSetter.length;
  }, [rallies, players, filters.side]);

  return { distributionStats, setters, destinations: DESTINATIONS, globalReceptionBreakdown, incompleteDistributionCount };
}
