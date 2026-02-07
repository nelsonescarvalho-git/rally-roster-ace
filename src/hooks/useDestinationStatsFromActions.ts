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
      
      // Track pending setter destinations waiting for an attack (Architecture 1)
      let pendingDestination: PassDestination | null = null;
      let pendingSetterSide: Side | null = null;
      
      for (const action of sortedActions) {
        // If this is a setter action with a destination
        if (action.action_type === 'setter' && action.pass_destination) {
          const dest = action.pass_destination as PassDestination;
          const setterSide = action.side as Side;
          
          // Apply side filter
          if (!side || setterSide === side) {
            // 1. Count ALL distributions as attempts immediately
            stats[dest].attempts++;
            
            // 2. Architecture 2 (Combo): If setter has code, use it directly
            if (action.code !== null && action.code !== undefined) {
              if (action.code === 3) stats[dest].kills++;
              else if (action.code === 0) stats[dest].errors++;
              else if (action.code === 1) stats[dest].blocked++;
              else if (action.code === 2) stats[dest].defended++;
              // Result already processed, no need to wait for attack
              continue;
            }
          }
          
          // 3. Architecture 1: Store for correlation with subsequent attack
          pendingDestination = dest;
          pendingSetterSide = setterSide;
        }
        
        // Architecture 1: Correlate attack with pending setter
        if (action.action_type === 'attack' && pendingDestination !== null) {
          const attackSide = action.side as Side;
          
          // Only correlate if attack is from the same side as the setter
          if (pendingSetterSide === attackSide) {
            if (!side || attackSide === side) {
              const dest = pendingDestination;
              const code = action.code;
              
              // Don't increment attempts again (already counted at setter)
              // Just categorize the result
              if (code === 3) stats[dest].kills++;
              else if (code === 0) stats[dest].errors++;
              else if (code === 1) stats[dest].blocked++;
              else if (code === 2) stats[dest].defended++;
            }
          }
          
          // Clear pending after processing
          pendingDestination = null;
          pendingSetterSide = null;
        }
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
