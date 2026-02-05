import { useMemo } from 'react';
import { Rally, PassDestination, Side, Player, MatchPlayer } from '@/types/volleyball';

export interface DestinationStats {
  destination: PassDestination;
  attempts: number;
  kills: number;
  errors: number;
  killRate: number;
  efficiency: number;
}

const ALL_DESTINATIONS: PassDestination[] = ['P2', 'P3', 'P4', 'OP', 'PIPE', 'BACK', 'OUTROS'];

/**
 * Calculates attack statistics per destination (pass_destination)
 * based on rally data from the current match.
 * 
 * @param rallies - All rallies from the match
 * @param players - Players in the match (for filtering by side)
 * @param side - Optional side filter to show stats for a specific team
 * @returns Record of stats per destination
 */
export function useDestinationStats(
  rallies: Rally[],
  players: (Player | MatchPlayer)[],
  side?: Side | null
): Record<PassDestination, DestinationStats> {
  return useMemo(() => {
    // Initialize stats for all destinations
    const stats: Record<PassDestination, DestinationStats> = {} as Record<PassDestination, DestinationStats>;
    
    ALL_DESTINATIONS.forEach(dest => {
      stats[dest] = {
        destination: dest,
        attempts: 0,
        kills: 0,
        errors: 0,
        killRate: 0,
        efficiency: 0,
      };
    });
    
    // Create a set of player IDs for the specified side for quick lookup
    const sidePlayerIds = side 
      ? new Set(
          players
            .filter(p => 'side' in p && p.side === side)
            .map(p => p.id)
        )
      : null;
    
    // Filter rallies with a_code defined (pass_destination optional - fallback to OUTROS)
    const relevantRallies = rallies.filter(rally => {
      // Must have attack code to count as an attack attempt
      if (rally.a_code === null || rally.a_code === undefined) {
        return false;
      }
      
      // If side filter is specified, only include rallies where the attacker is from that side
      if (sidePlayerIds && rally.a_player_id) {
        return sidePlayerIds.has(rally.a_player_id);
      }
      
      // If no side filter, include all attacks
      return true;
    });
    
    // Aggregate statistics by destination (fallback to OUTROS when missing)
    relevantRallies.forEach(rally => {
      const dest = (rally.pass_destination as PassDestination) || 'OUTROS';
      if (!stats[dest]) return;
      
      stats[dest].attempts++;
      
      // a_code = 3 means kill
      if (rally.a_code === 3) {
        stats[dest].kills++;
      }
      
      // a_code = 0 means error
      if (rally.a_code === 0) {
        stats[dest].errors++;
      }
    });
    
    // Calculate rates
    ALL_DESTINATIONS.forEach(dest => {
      const s = stats[dest];
      if (s.attempts > 0) {
        s.killRate = s.kills / s.attempts;
        s.efficiency = (s.kills - s.errors) / s.attempts;
      }
    });
    
    return stats;
  }, [rallies, players, side]);
}
