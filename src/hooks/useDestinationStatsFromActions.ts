import { useMemo } from 'react';
import { PassDestination, Side } from '@/types/volleyball';
import type { RallyActionWithPlayer } from '@/types/rallyActions';

export interface DestinationStatsFromActions {
  destination: PassDestination;
  attempts: number;      // Total de passes para este destino
  kills: number;         // Ataques com code = 3
  errors: number;        // Ataques com code = 0
  blocked: number;       // Ataques com code = 1
  defended: number;      // Ataques com code = 2
  killRate: number;      // kills / attempts
  efficiency: number;    // (kills - errors) / attempts
}

const ALL_DESTINATIONS: PassDestination[] = ['P2', 'P3', 'P4', 'OP', 'PIPE', 'BACK', 'OUTROS'];

/**
 * Calculates attack statistics per destination by correlating setter→attack pairs
 * from the rally_actions table. This correctly handles the new architecture where
 * pass_destination is on the setter action and code is on the attack action.
 * 
 * @param rallyActions - Map of rally_id to actions array
 * @param side - Optional side filter to show stats for a specific team
 * @returns Record of stats per destination
 */
export function useDestinationStatsFromActions(
  rallyActions: Map<string, RallyActionWithPlayer[]> | undefined,
  side?: Side | null
): Record<PassDestination, DestinationStatsFromActions> {
  return useMemo(() => {
    // Initialize stats for all destinations
    const stats: Record<PassDestination, DestinationStatsFromActions> = {} as Record<PassDestination, DestinationStatsFromActions>;
    
    ALL_DESTINATIONS.forEach(dest => {
      stats[dest] = {
        destination: dest,
        attempts: 0,
        kills: 0,
        errors: 0,
        blocked: 0,
        defended: 0,
        killRate: 0,
        efficiency: 0,
      };
    });
    
    if (!rallyActions || rallyActions.size === 0) {
      return stats;
    }
    
    // Process each rally's actions
    rallyActions.forEach((actions, _rallyId) => {
      // Sort by sequence_no to ensure correct order
      const sortedActions = [...actions].sort((a, b) => a.sequence_no - b.sequence_no);
      
      // Track pending setter destinations waiting for an attack
      let pendingDestination: PassDestination | null = null;
      let pendingSetterSide: Side | null = null;
      
      for (const action of sortedActions) {
        // If this is a setter action with a destination, store it
        if (action.action_type === 'setter' && action.pass_destination) {
          pendingDestination = action.pass_destination as PassDestination;
          pendingSetterSide = action.side as Side;
        }
        
        // If this is an attack action, correlate with pending setter
        if (action.action_type === 'attack' && pendingDestination !== null) {
          const attackSide = action.side as Side;
          
          // Only count if attack is from the same side as the setter (same team sequence)
          // and matches the side filter if specified
          if (pendingSetterSide === attackSide) {
            if (!side || attackSide === side) {
              const dest = pendingDestination;
              const code = action.code;
              
              // Always increment attempts (every pass to this zone counts)
              stats[dest].attempts++;
              
              // Categorize the result
              if (code === 3) {
                stats[dest].kills++;
              } else if (code === 0) {
                stats[dest].errors++;
              } else if (code === 1) {
                stats[dest].blocked++;
              } else if (code === 2) {
                stats[dest].defended++;
              }
            }
          }
          
          // Clear pending destination after processing attack
          pendingDestination = null;
          pendingSetterSide = null;
        }
        
        // If we hit another setter before an attack, update pending destination
        // This handles cases where there might be multiple setters before an attack
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
  }, [rallyActions, side]);
}
