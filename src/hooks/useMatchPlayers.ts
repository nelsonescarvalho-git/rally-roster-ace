import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MatchPlayer, TeamPlayer, Side } from '@/types/volleyball';
import { useToast } from '@/hooks/use-toast';

export function useMatchPlayers(matchId: string | null) {
  const { toast } = useToast();
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayer[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMatchPlayers = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('match_players')
        .select('*')
        .eq('match_id', matchId)
        .order('jersey_number');

      if (error) throw error;
      setMatchPlayers(data as MatchPlayer[]);
    } catch (error: any) {
      toast({ title: 'Erro', description: 'Erro ao carregar jogadores do jogo', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [matchId, toast]);

  const getPlayersForSide = useCallback((side: Side): MatchPlayer[] => {
    return matchPlayers.filter(p => p.side === side);
  }, [matchPlayers]);

  const importTeamPlayers = useCallback(async (
    teamId: string,
    side: Side,
    teamPlayers: TeamPlayer[]
  ): Promise<boolean> => {
    if (!matchId) return false;
    
    try {
      // First, remove existing match_players for this side
      await supabase
        .from('match_players')
        .delete()
        .eq('match_id', matchId)
        .eq('side', side);

      // Insert new match_players from team roster
      const insertData = teamPlayers.map(tp => ({
        match_id: matchId,
        team_id: teamId,
        team_player_id: tp.id,
        side,
        jersey_number: tp.jersey_number,
        name: tp.name,
        position: tp.position,
      }));

      if (insertData.length > 0) {
        const { error } = await supabase
          .from('match_players')
          .insert(insertData);

        if (error) throw error;
      }

      await loadMatchPlayers();
      toast({ title: 'Jogadores importados' });
      return true;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }
  }, [matchId, loadMatchPlayers, toast]);

  const addMatchPlayer = useCallback(async (
    teamId: string,
    side: Side,
    jerseyNumber: number,
    name: string,
    position: string | null,
    teamPlayerId: string | null = null
  ): Promise<MatchPlayer | null> => {
    if (!matchId) return null;
    
    try {
      const { data, error } = await supabase
        .from('match_players')
        .insert([{
          match_id: matchId,
          team_id: teamId,
          team_player_id: teamPlayerId,
          side,
          jersey_number: jerseyNumber,
          name: name.trim(),
          position: position?.trim() || null,
        }])
        .select()
        .single();

      if (error) throw error;
      await loadMatchPlayers();
      toast({ title: 'Jogador adicionado ao jogo' });
      return data as MatchPlayer;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return null;
    }
  }, [matchId, loadMatchPlayers, toast]);

  const removeMatchPlayer = useCallback(async (playerId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('match_players')
        .delete()
        .eq('id', playerId);

      if (error) throw error;
      await loadMatchPlayers();
      return true;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }
  }, [loadMatchPlayers, toast]);

  return {
    matchPlayers,
    loading,
    loadMatchPlayers,
    getPlayersForSide,
    importTeamPlayers,
    addMatchPlayer,
    removeMatchPlayer,
  };
}
