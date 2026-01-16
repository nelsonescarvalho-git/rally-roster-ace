import { useMemo } from 'react';
import { Rally, Player, MatchPlayer, Side, PassDestination } from '@/types/volleyball';

export interface SetterDistribution {
  setterId: string;
  setterName: string;
  jerseyNumber: number;
  side: Side;
  destinations: Record<PassDestination | 'OUTROS', number>;
  total: number;
  preference: string;
  top2: string;
}

const DESTINATIONS: (PassDestination | 'OUTROS')[] = ['P2', 'P3', 'P4', 'OP', 'PIPE', 'BACK', 'OUTROS'];

export function useDistributionStats(
  rallies: Rally[],
  players: (Player | MatchPlayer)[],
  filters: {
    side: Side | 'TODAS';
    setterId: string | null;
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
    const validRallies = Object.values(finalPhases).filter(
      r => r.setter_player_id && r.pass_destination
    );

    // Group by setter
    const setterStats: Record<string, SetterDistribution> = {};

    validRallies.forEach(rally => {
      const setterId = rally.setter_player_id!;
      const destination = rally.pass_destination as PassDestination | 'OUTROS';
      
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
        };
      }

      const validDest = DESTINATIONS.includes(destination) ? destination : 'OUTROS';
      setterStats[setterId].destinations[validDest]++;
      setterStats[setterId].total++;
    });

    // Calculate preference and top2
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
    });

    // Sort by side and name
    return Object.values(setterStats).sort((a, b) => {
      if (a.side !== b.side) return a.side === 'CASA' ? -1 : 1;
      return a.setterName.localeCompare(b.setterName);
    });
  }, [rallies, players, filters.side, filters.setterId]);

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

  return { distributionStats, setters, destinations: DESTINATIONS };
}
