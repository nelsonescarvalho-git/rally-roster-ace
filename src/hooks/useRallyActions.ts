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
