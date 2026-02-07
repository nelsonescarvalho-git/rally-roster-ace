import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RallyActionRecord, RallyActionInsert, RallyActionUpdate, RallyActionWithPlayer } from '@/types/rallyActions';

// Fetch all actions for a specific rally
export function useRallyActions(rallyId: string | null) {
  return useQuery({
    queryKey: ['rally-actions', rallyId],
    queryFn: async (): Promise<RallyActionWithPlayer[]> => {
      if (!rallyId) return [];
      
      const { data, error } = await supabase
        .from('rally_actions')
        .select(`
          *,
          player:match_players!rally_actions_player_id_fkey(id, name, jersey_number),
          b2_player:match_players!rally_actions_b2_player_id_fkey(id, name, jersey_number),
          b3_player:match_players!rally_actions_b3_player_id_fkey(id, name, jersey_number)
        `)
        .eq('rally_id', rallyId)
        .is('deleted_at', null)
        .order('sequence_no', { ascending: true });

      if (error) throw error;

      // Transform to include player details
      return (data || []).map((action: any) => ({
        ...action,
        player_name: action.player?.name,
        player_jersey: action.player?.jersey_number,
        b2_player_name: action.b2_player?.name,
        b2_player_jersey: action.b2_player?.jersey_number,
        b3_player_name: action.b3_player?.name,
        b3_player_jersey: action.b3_player?.jersey_number,
        // Remove nested objects
        player: undefined,
        b2_player: undefined,
        b3_player: undefined,
      }));
    },
    enabled: !!rallyId,
  });
}

// Fetch all actions for multiple rallies (for batch display)
export function useRallyActionsForMatch(matchId: string | null) {
  return useQuery({
    queryKey: ['rally-actions-match', matchId],
    queryFn: async (): Promise<Map<string, RallyActionWithPlayer[]>> => {
      if (!matchId) return new Map();
      
      // First get all rally IDs for this match
      const { data: rallies, error: ralliesError } = await supabase
        .from('rallies')
        .select('id')
        .eq('match_id', matchId)
        .is('deleted_at', null);

      if (ralliesError) throw ralliesError;
      if (!rallies?.length) return new Map();

      const rallyIds = rallies.map(r => r.id);

      const { data, error } = await supabase
        .from('rally_actions')
        .select(`
          *,
          player:match_players!rally_actions_player_id_fkey(id, name, jersey_number),
          b2_player:match_players!rally_actions_b2_player_id_fkey(id, name, jersey_number),
          b3_player:match_players!rally_actions_b3_player_id_fkey(id, name, jersey_number)
        `)
        .in('rally_id', rallyIds)
        .is('deleted_at', null)
        .order('sequence_no', { ascending: true });

      if (error) throw error;

      // Group by rally_id
      const actionsByRally = new Map<string, RallyActionWithPlayer[]>();
      
      (data || []).forEach((action: any) => {
        const transformed: RallyActionWithPlayer = {
          ...action,
          player_name: action.player?.name,
          player_jersey: action.player?.jersey_number,
          b2_player_name: action.b2_player?.name,
          b2_player_jersey: action.b2_player?.jersey_number,
          b3_player_name: action.b3_player?.name,
          b3_player_jersey: action.b3_player?.jersey_number,
          player: undefined,
          b2_player: undefined,
          b3_player: undefined,
        };

        const existing = actionsByRally.get(action.rally_id) || [];
        existing.push(transformed);
        actionsByRally.set(action.rally_id, existing);
      });

      return actionsByRally;
    },
    enabled: !!matchId,
  });
}

// Create a new action
export function useCreateRallyAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: RallyActionInsert): Promise<RallyActionRecord> => {
      const { data, error } = await supabase
        .from('rally_actions')
        .insert(action as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as RallyActionRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rally-actions', data.rally_id] });
      queryClient.invalidateQueries({ queryKey: ['rally-actions-match'] });
    },
  });
}

// Create multiple actions at once (for batch insert)
export function useCreateRallyActions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actions: RallyActionInsert[]): Promise<RallyActionRecord[]> => {
      if (!actions.length) return [];
      
      const { data, error } = await supabase
        .from('rally_actions')
        .insert(actions as any)
        .select();

      if (error) throw error;
      return (data || []) as unknown as RallyActionRecord[];
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        const rallyIds = [...new Set(data.map(a => a.rally_id))];
        rallyIds.forEach(rallyId => {
          queryClient.invalidateQueries({ queryKey: ['rally-actions', rallyId] });
        });
        queryClient.invalidateQueries({ queryKey: ['rally-actions-match'] });
      }
    },
  });
}

// Update an existing action
export function useUpdateRallyAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: RallyActionUpdate }): Promise<RallyActionRecord> => {
      const { data, error } = await supabase
        .from('rally_actions')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as RallyActionRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rally-actions', data.rally_id] });
      queryClient.invalidateQueries({ queryKey: ['rally-actions-match'] });
    },
  });
}

// Soft delete an action
export function useDeleteRallyAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('rally_actions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rally-actions'] });
      queryClient.invalidateQueries({ queryKey: ['rally-actions-match'] });
    },
  });
}

// Delete all actions for a rally (when re-recording)
export function useDeleteRallyActions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rallyId: string): Promise<void> => {
      const { error } = await supabase
        .from('rally_actions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('rally_id', rallyId);

      if (error) throw error;
    },
    onSuccess: (_, rallyId) => {
      queryClient.invalidateQueries({ queryKey: ['rally-actions', rallyId] });
      queryClient.invalidateQueries({ queryKey: ['rally-actions-match'] });
    },
  });
}

// Batch update multiple actions and sync to rallies table
export function useBatchUpdateRallyActions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      rallyId, 
      actions, 
      metaUpdates 
    }: { 
      rallyId: string; 
      actions: Array<{ id: string; updates: RallyActionUpdate }>;
      metaUpdates?: { 
        point_won_by?: string | null; 
        reason?: string | null;
      };
    }): Promise<void> => {
      // 1. Update all actions in rally_actions table
      for (const action of actions) {
        const { error } = await supabase
          .from('rally_actions')
          .update(action.updates as any)
          .eq('id', action.id);
        
        if (error) throw error;
      }

      // 2. Sync first action of each type to rallies table for legacy compatibility
      const { data: updatedActions, error: fetchError } = await supabase
        .from('rally_actions')
        .select('*')
        .eq('rally_id', rallyId)
        .is('deleted_at', null)
        .order('sequence_no', { ascending: true });

      if (fetchError) throw fetchError;

      const firstServe = updatedActions?.find(a => a.action_type === 'serve');
      const firstReception = updatedActions?.find(a => a.action_type === 'reception');
      const firstSetter = updatedActions?.find(a => a.action_type === 'setter');
      const firstAttack = updatedActions?.find(a => a.action_type === 'attack');
      const firstBlock = updatedActions?.find(a => a.action_type === 'block');
      const firstDefense = updatedActions?.find(a => a.action_type === 'defense');

      // Build rallies update
      const ralliesUpdate: Record<string, any> = {
        s_player_id: firstServe?.player_id ?? null,
        s_no: firstServe?.player_no ?? null,
        s_code: firstServe?.code ?? null,
        s_type: firstServe?.serve_type ?? null,
        r_player_id: firstReception?.player_id ?? null,
        r_no: firstReception?.player_no ?? null,
        r_code: firstReception?.code ?? null,
        setter_player_id: firstSetter?.player_id ?? null,
        pass_destination: firstSetter?.pass_destination ?? null,
        pass_code: firstSetter?.pass_code ?? firstSetter?.code ?? null,
        a_player_id: firstAttack?.player_id ?? null,
        a_no: firstAttack?.player_no ?? null,
        a_code: firstAttack?.code ?? null,
        kill_type: firstAttack?.kill_type ?? null,
        b1_player_id: firstBlock?.player_id ?? null,
        b1_no: firstBlock?.player_no ?? null,
        b_code: firstBlock?.code ?? null,
        b2_player_id: firstBlock?.b2_player_id ?? null,
        b2_no: firstBlock?.b2_no ?? null,
        b3_player_id: firstBlock?.b3_player_id ?? null,
        b3_no: firstBlock?.b3_no ?? null,
        d_player_id: firstDefense?.player_id ?? null,
        d_no: firstDefense?.player_no ?? null,
        d_code: firstDefense?.code ?? null,
      };

      if (metaUpdates) {
        if (metaUpdates.point_won_by !== undefined) {
          ralliesUpdate.point_won_by = metaUpdates.point_won_by;
        }
        if (metaUpdates.reason !== undefined) {
          ralliesUpdate.reason = metaUpdates.reason;
        }
      }

      const { error: ralliesError } = await supabase
        .from('rallies')
        .update(ralliesUpdate)
        .eq('id', rallyId);

      if (ralliesError) throw ralliesError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rally-actions'] });
      queryClient.invalidateQueries({ queryKey: ['rally-actions-match'] });
      queryClient.invalidateQueries({ queryKey: ['rallies'] });
    },
  });
}

// Get next sequence number for a rally
export async function getNextSequenceNo(rallyId: string): Promise<number> {
  const { data, error } = await supabase
    .from('rally_actions')
    .select('sequence_no')
    .eq('rally_id', rallyId)
    .is('deleted_at', null)
    .order('sequence_no', { ascending: false })
    .limit(1);

  if (error) throw error;
  
  return (data?.[0]?.sequence_no ?? 0) + 1;
}

// Types for auto-fix function
interface MatchPlayer {
  id: string;
  side: string;
  position: string | null;
  jersey_number: number;
}

// Auto-fix rally actions - fills in missing player_id for setters based on position
export function useAutoFixRallyActions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      matchId, 
      players 
    }: { 
      matchId: string; 
      players: MatchPlayer[];
    }): Promise<{ fixed: number; errors: number; skipped: number }> => {
      let fixed = 0;
      let errors = 0;
      let skipped = 0;
      
      // Get all rally IDs for this match
      const { data: rallies, error: ralliesError } = await supabase
        .from('rallies')
        .select('id')
        .eq('match_id', matchId)
        .is('deleted_at', null);

      if (ralliesError) throw ralliesError;
      if (!rallies?.length) return { fixed: 0, errors: 0, skipped: 0 };

      const rallyIds = rallies.map(r => r.id);

      // Get all setter actions without player_id
      const { data: settersToFix, error: settersError } = await supabase
        .from('rally_actions')
        .select('id, side, player_id, rally_id')
        .eq('action_type', 'setter')
        .is('player_id', null)
        .is('deleted_at', null)
        .in('rally_id', rallyIds);

      if (settersError) throw settersError;
      if (!settersToFix?.length) return { fixed: 0, errors: 0, skipped: 0 };

      // Group setters by side for efficient lookup
      const settersBySide: Record<string, MatchPlayer | undefined> = {};
      players.forEach(p => {
        if (p.position === 'S') {
          settersBySide[p.side] = p;
        }
      });

      // Fix each setter action
      for (const action of settersToFix) {
        const setter = settersBySide[action.side];
        
        if (setter) {
          const { error } = await supabase
            .from('rally_actions')
            .update({ 
              player_id: setter.id,
              player_no: setter.jersey_number 
            })
            .eq('id', action.id);
          
          if (error) {
            errors++;
          } else {
            fixed++;
            
            // Also sync to rallies table (setter_player_id)
            await supabase
              .from('rallies')
              .update({ setter_player_id: setter.id })
              .eq('id', action.rally_id);
          }
        } else {
          skipped++;
        }
      }
      
      return { fixed, errors, skipped };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rally-actions'] });
      queryClient.invalidateQueries({ queryKey: ['rally-actions-match'] });
      queryClient.invalidateQueries({ queryKey: ['rallies'] });
    },
  });
}

// Comprehensive auto-fix: fills in setter codes based on subsequent attack results
export function useComprehensiveAutoFix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      matchId 
    }: { 
      matchId: string;
    }): Promise<{
      setterCodesFixed: number;
      settersSkipped: number;
      errors: number;
    }> => {
      const results = { setterCodesFixed: 0, settersSkipped: 0, errors: 0 };
      
      // 1. Get all rally IDs for this match
      const { data: rallies, error: ralliesError } = await supabase
        .from('rallies')
        .select('id')
        .eq('match_id', matchId)
        .is('deleted_at', null);

      if (ralliesError) throw ralliesError;
      if (!rallies?.length) return results;

      const rallyIds = rallies.map(r => r.id);

      // 2. Get all actions for these rallies
      const { data: allActions, error: actionsError } = await supabase
        .from('rally_actions')
        .select('*')
        .in('rally_id', rallyIds)
        .is('deleted_at', null)
        .order('rally_id', { ascending: true })
        .order('sequence_no', { ascending: true });

      if (actionsError) throw actionsError;
      if (!allActions?.length) return results;

      // 3. Group actions by rally_id
      const actionsByRally = new Map<string, typeof allActions>();
      allActions.forEach(action => {
        const existing = actionsByRally.get(action.rally_id) || [];
        existing.push(action);
        actionsByRally.set(action.rally_id, existing);
      });

      // 4. For each rally, infer missing codes
      for (const [rallyId, actions] of actionsByRally.entries()) {
        for (const action of actions) {
          // Fix setter codes based on subsequent attack
          if (action.action_type === 'setter' && action.code === null) {
            // Find next attack from same side
            const nextAttack = actions.find(a => 
              a.sequence_no > action.sequence_no &&
              a.action_type === 'attack' &&
              a.side === action.side
            );
            
            if (nextAttack && nextAttack.code !== null) {
              // Infer code from attack result
              const { error } = await supabase
                .from('rally_actions')
                .update({ code: nextAttack.code })
                .eq('id', action.id);
              
              if (error) {
                results.errors++;
              } else {
                results.setterCodesFixed++;
                
                // Sync to rallies table (pass_code)
                await supabase
                  .from('rallies')
                  .update({ pass_code: nextAttack.code })
                  .eq('id', rallyId);
              }
            } else {
              results.settersSkipped++;
            }
          }
        }
      }
      
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rally-actions'] });
      queryClient.invalidateQueries({ queryKey: ['rally-actions-match'] });
      queryClient.invalidateQueries({ queryKey: ['rallies'] });
    },
  });
}

// Types for lineup
interface LineupRow {
  id: string;
  match_id: string;
  set_no: number;
  side: string;
  rot1: string | null;
  rot2: string | null;
  rot3: string | null;
  rot4: string | null;
  rot5: string | null;
  rot6: string | null;
}

interface RallyRow {
  id: string;
  set_no: number;
  serve_side: string;
  serve_rot: number;
}

/**
 * Auto-fix serve actions by calculating server from rotation.
 * 
 * The serve_rot field indicates which rotation position is serving (1-6).
 * The lineup stores players by their starting position (rot1-rot6).
 * 
 * Rotation logic:
 * - serve_rot=1: rot1 is in position 1 (serving)
 * - serve_rot=2: rot2 is in position 1 (serving)
 * - serve_rot=N: rotN is in position 1 (serving)
 */
export function useAutoFixServeByRotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      matchId,
      players
    }: { 
      matchId: string;
      players: { id: string; side: string; jersey_number: number }[];
    }): Promise<{ fixed: number; errors: number; skipped: number }> => {
      let fixed = 0;
      let errors = 0;
      let skipped = 0;
      
      // 1. Get all lineups for this match
      const { data: lineups, error: lineupsError } = await supabase
        .from('lineups')
        .select('*')
        .eq('match_id', matchId)
        .is('deleted_at', null);

      if (lineupsError) throw lineupsError;
      if (!lineups?.length) return { fixed: 0, errors: 0, skipped: 0 };

      // Create lineup map: {set_no-side} -> lineup
      const lineupMap = new Map<string, LineupRow>();
      (lineups as LineupRow[]).forEach(l => {
        lineupMap.set(`${l.set_no}-${l.side}`, l);
      });

      // 2. Get all rallies with serve info
      const { data: rallies, error: ralliesError } = await supabase
        .from('rallies')
        .select('id, set_no, serve_side, serve_rot')
        .eq('match_id', matchId)
        .is('deleted_at', null);

      if (ralliesError) throw ralliesError;
      if (!rallies?.length) return { fixed: 0, errors: 0, skipped: 0 };

      // 3. Get all serve actions that might need fixing
      const rallyIds = (rallies as RallyRow[]).map(r => r.id);
      const { data: serveActions, error: serveError } = await supabase
        .from('rally_actions')
        .select('id, rally_id, player_id, player_no, side')
        .eq('action_type', 'serve')
        .in('rally_id', rallyIds)
        .is('deleted_at', null);

      if (serveError) throw serveError;
      if (!serveActions?.length) return { fixed: 0, errors: 0, skipped: 0 };

      // Create rally lookup
      const rallyMap = new Map<string, RallyRow>();
      (rallies as RallyRow[]).forEach(r => {
        rallyMap.set(r.id, r);
      });

      // Create player lookup by id
      const playerById = new Map(players.map(p => [p.id, p]));

      // 4. For each serve action, calculate expected server from rotation
      for (const action of serveActions) {
        const rally = rallyMap.get(action.rally_id);
        if (!rally) {
          skipped++;
          continue;
        }

        const lineup = lineupMap.get(`${rally.set_no}-${rally.serve_side}`);
        if (!lineup) {
          skipped++;
          continue;
        }

        // Get server from rotation
        // serve_rot indicates which position is serving
        // rot1 = player starting in zone 1, rot2 = player starting in zone 2, etc.
        // When serve_rot=N, the player in rotN is the server
        const rotKey = `rot${rally.serve_rot}` as keyof LineupRow;
        const expectedServerId = lineup[rotKey] as string | null;

        if (!expectedServerId) {
          skipped++;
          continue;
        }

        // Check if action needs update
        if (action.player_id === expectedServerId) {
          // Already correct
          continue;
        }

        // Get player jersey number
        const serverPlayer = playerById.get(expectedServerId);
        if (!serverPlayer) {
          skipped++;
          continue;
        }

        // Update the serve action
        const { error } = await supabase
          .from('rally_actions')
          .update({ 
            player_id: expectedServerId,
            player_no: serverPlayer.jersey_number,
            side: rally.serve_side // Ensure side is correct
          })
          .eq('id', action.id);

        if (error) {
          errors++;
          continue;
        }

        // Also sync to rallies table
        await supabase
          .from('rallies')
          .update({ 
            s_player_id: expectedServerId,
            s_no: serverPlayer.jersey_number 
          })
          .eq('id', action.rally_id);

        fixed++;
      }
      
      return { fixed, errors, skipped };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rally-actions'] });
      queryClient.invalidateQueries({ queryKey: ['rally-actions-match'] });
      queryClient.invalidateQueries({ queryKey: ['rallies'] });
    },
  });
}
