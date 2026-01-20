import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMatches } from './useMatches';
import { useTeams } from './useTeams';

interface SetScore {
  set_no: number;
  home_score: number;
  away_score: number;
}

interface DashboardStats {
  totalMatches: number;
  teamsCount: number;
  totalRallies: number;
  lastMatch: any | null;
  lastMatchScores: SetScore[];
  homeSetsWon: number;
  awaySetsWon: number;
  loading: boolean;
}

export function useDashboardStats(): DashboardStats {
  const { matches, loading: matchesLoading } = useMatches();
  const { teams, loading: teamsLoading } = useTeams();
  
  const lastMatch = matches[0] || null;
  
  // Fetch total rallies count
  const { data: ralliesData } = useQuery({
    queryKey: ['dashboard-rallies-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('rallies')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });
  
  // Fetch last match scores by set
  const { data: scoresData } = useQuery({
    queryKey: ['dashboard-last-match-scores', lastMatch?.id],
    queryFn: async () => {
      if (!lastMatch?.id) return [];
      
      const { data, error } = await supabase
        .from('rallies')
        .select('set_no, point_won_by')
        .eq('match_id', lastMatch.id)
        .not('point_won_by', 'is', null);
      
      if (error) throw error;
      
      // Group by set and count scores
      const setScores: Record<number, { home: number; away: number }> = {};
      
      data?.forEach(rally => {
        if (!setScores[rally.set_no]) {
          setScores[rally.set_no] = { home: 0, away: 0 };
        }
        if (rally.point_won_by === 'CASA') {
          setScores[rally.set_no].home++;
        } else if (rally.point_won_by === 'FORA') {
          setScores[rally.set_no].away++;
        }
      });
      
      return Object.entries(setScores).map(([setNo, scores]) => ({
        set_no: parseInt(setNo),
        home_score: scores.home,
        away_score: scores.away,
      })).sort((a, b) => a.set_no - b.set_no);
    },
    enabled: !!lastMatch?.id,
  });
  
  const lastMatchScores = scoresData || [];
  
  // Calculate sets won
  const homeSetsWon = lastMatchScores.filter(s => s.home_score > s.away_score).length;
  const awaySetsWon = lastMatchScores.filter(s => s.away_score > s.home_score).length;
  
  return {
    totalMatches: matches.length,
    teamsCount: teams.length,
    totalRallies: ralliesData || 0,
    lastMatch,
    lastMatchScores,
    homeSetsWon,
    awaySetsWon,
    loading: matchesLoading || teamsLoading,
  };
}
