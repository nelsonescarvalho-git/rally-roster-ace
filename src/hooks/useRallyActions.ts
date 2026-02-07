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
