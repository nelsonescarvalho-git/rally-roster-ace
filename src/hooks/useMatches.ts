import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Match } from '@/types/volleyball';
import { useToast } from '@/hooks/use-toast';

export function useMatches() {
  const { toast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMatches(data as Match[]);
    } catch (error: any) {
      toast({ title: 'Erro', description: 'Erro ao carregar jogos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const createMatch = useCallback(async (matchData: Partial<Match>) => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .insert([matchData as any])
        .select()
        .single();

      if (error) throw error;
      await loadMatches();
      return data as Match;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return null;
    }
  }, [loadMatches, toast]);

  const deleteMatch = useCallback(async (matchId: string) => {
    try {
      const { error } = await supabase.rpc('soft_delete_match', { p_match_id: matchId });
      if (error) throw error;
      await loadMatches();
      toast({ title: 'Eliminado', description: 'Jogo removido com sucesso. Será apagado definitivamente em 15 dias.' });
      return true;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }
  }, [loadMatches, toast]);

  return { matches, loading, loadMatches, createMatch, deleteMatch };
}
