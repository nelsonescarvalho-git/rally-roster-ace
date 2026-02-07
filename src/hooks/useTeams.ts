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

  const createTeam = useCallback(async (
    name: string,
    options?: {
      coach_name?: string | null;
      assistant_coach?: string | null;
      team_manager?: string | null;
      primary_color?: string | null;
      secondary_color?: string | null;
    }
  ): Promise<Team | null> => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert([{
          name: name.trim(),
          coach_name: options?.coach_name?.trim() || null,
          assistant_coach: options?.assistant_coach?.trim() || null,
          team_manager: options?.team_manager?.trim() || null,
          primary_color: options?.primary_color || null,
          secondary_color: options?.secondary_color || null,
        }])
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
    position: string | null,
    options?: {
      height_cm?: number | null;
      birth_date?: string | null;
      federation_id?: string | null;
      is_captain?: boolean;
    }
  ): Promise<TeamPlayer | null> => {
    try {
      const { data, error } = await supabase
        .from('team_players')
        .insert([{
          team_id: teamId,
          jersey_number: jerseyNumber,
          name: name.trim(),
          position: position?.trim() || null,
          height_cm: options?.height_cm || null,
          birth_date: options?.birth_date || null,
          federation_id: options?.federation_id?.trim() || null,
          is_captain: options?.is_captain || false,
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
    updates: {
      name?: string;
      primary_color?: string | null;
      secondary_color?: string | null;
      coach_name?: string | null;
      assistant_coach?: string | null;
      team_manager?: string | null;
    }
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

  const uploadLogo = useCallback(async (
    teamId: string,
    file: File
  ): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${teamId}.${fileExt}`;

      // Upload para o bucket
      const { error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL público com cache busting
      const { data: { publicUrl } } = supabase.storage
        .from('team-logos')
        .getPublicUrl(fileName);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      // Atualizar tabela teams
      const { error: updateError } = await supabase
        .from('teams')
        .update({ logo_url: urlWithCacheBust })
        .eq('id', teamId);

      if (updateError) throw updateError;

      await loadTeams();
      toast({ title: 'Logótipo atualizado' });
      return urlWithCacheBust;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return null;
    }
  }, [loadTeams, toast]);

  const removeLogo = useCallback(async (teamId: string): Promise<boolean> => {
    try {
      // Listar ficheiros com prefixo do teamId
      const { data: files } = await supabase.storage
        .from('team-logos')
        .list('', { search: teamId });

      if (files && files.length > 0) {
        await supabase.storage
          .from('team-logos')
          .remove(files.map(f => f.name));
      }

      // Limpar campo na tabela
      const { error } = await supabase
        .from('teams')
        .update({ logo_url: null })
        .eq('id', teamId);

      if (error) throw error;

      await loadTeams();
      toast({ title: 'Logótipo removido' });
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
    uploadLogo,
    removeLogo,
  };
}
