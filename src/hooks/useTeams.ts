import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Team, TeamPlayer } from '@/types/volleyball';
import { useToast } from '@/hooks/use-toast';

export function useTeams() {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');

      if (error) throw error;
      setTeams(data as Team[]);
    } catch (error: any) {
      toast({ title: 'Erro', description: 'Erro ao carregar equipas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const createTeam = useCallback(async (name: string): Promise<Team | null> => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert([{ name: name.trim() }])
        .select()
        .single();

      if (error) throw error;
      await loadTeams();
      toast({ title: 'Equipa criada', description: name });
      return data as Team;
    } catch (error: any) {
      // If duplicate, try to fetch existing
      if (error.code === '23505') {
        const { data } = await supabase
          .from('teams')
          .select('*')
          .eq('name', name.trim())
          .maybeSingle();
        if (data) return data as Team;
      }
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return null;
    }
  }, [loadTeams, toast]);

  const getTeamPlayers = useCallback(async (teamId: string): Promise<TeamPlayer[]> => {
    try {
      const { data, error } = await supabase
        .from('team_players')
        .select('*')
        .eq('team_id', teamId)
        .eq('active', true)
        .order('jersey_number');

      if (error) throw error;
      return data as TeamPlayer[];
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return [];
    }
  }, [toast]);

  const addTeamPlayer = useCallback(async (
    teamId: string,
    jerseyNumber: number,
    name: string,
    position: string | null
  ): Promise<TeamPlayer | null> => {
    try {
      const { data, error } = await supabase
        .from('team_players')
        .insert([{
          team_id: teamId,
          jersey_number: jerseyNumber,
          name: name.trim(),
          position: position?.trim() || null,
        }])
        .select()
        .single();

      if (error) throw error;
      toast({ title: 'Jogador adicionado' });
      return data as TeamPlayer;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return null;
    }
  }, [toast]);

  const updateTeamPlayer = useCallback(async (
    playerId: string,
    updates: Partial<TeamPlayer>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('team_players')
        .update(updates)
        .eq('id', playerId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const deactivateTeamPlayer = useCallback(async (playerId: string): Promise<boolean> => {
    return updateTeamPlayer(playerId, { active: false });
  }, [updateTeamPlayer]);

  const updateTeam = useCallback(async (
    teamId: string,
    updates: { name?: string; primary_color?: string | null; secondary_color?: string | null }
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId);

      if (error) throw error;
      await loadTeams();
      toast({ title: 'Equipa atualizada' });
      return true;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }
  }, [loadTeams, toast]);

  return {
    teams,
    loading,
    loadTeams,
    createTeam,
    updateTeam,
    getTeamPlayers,
    addTeamPlayer,
    updateTeamPlayer,
    deactivateTeamPlayer,
  };
}
