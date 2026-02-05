import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMatches } from './useMatches';
import { useTeams } from './useTeams';

interface SetScore {
  set_no: number;
  home_score: number;
  away_score: number;
}

interface TeamColors {
  homePrimary: string | null;
  homeSecondary: string | null;
  awayPrimary: string | null;
  awaySecondary: string | null;
}

interface DashboardStats {
  totalMatches: number;
  teamsCount: number;
  totalRallies: number;
  lastMatch: any | null;
  lastMatchScores: SetScore[];
  homeSetsWon: number;
  awaySetsWon: number;
  teamColors: TeamColors | null;
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
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);
      
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
        .is('deleted_at', null)
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
  
  // Helper to check if a set is actually won (not just in progress)
  const isSetWon = (setNo: number, homeScore: number, awayScore: number): 'home' | 'away' | null => {
    const minPoints = setNo === 5 ? 15 : 25;
    const maxScore = Math.max(homeScore, awayScore);
    const diff = Math.abs(homeScore - awayScore);
    
    // Set is won when: reached minimum points AND has 2+ point difference
    if (maxScore >= minPoints && diff >= 2) {
      return homeScore > awayScore ? 'home' : 'away';
    }
    
    return null; // Set still in progress
  };
  
  // Calculate sets won (only count finished sets)
  const homeSetsWon = lastMatchScores.filter(s => 
    isSetWon(s.set_no, s.home_score, s.away_score) === 'home'
  ).length;
  const awaySetsWon = lastMatchScores.filter(s => 
    isSetWon(s.set_no, s.home_score, s.away_score) === 'away'
  ).length;
  
  // Fetch team colors
  const { data: teamColorsData } = useQuery({
    queryKey: ['dashboard-team-colors', lastMatch?.home_team_id, lastMatch?.away_team_id],
    queryFn: async () => {
      if (!lastMatch?.home_team_id && !lastMatch?.away_team_id) return null;
      
      const teamIds = [lastMatch.home_team_id, lastMatch.away_team_id].filter(Boolean);
      const { data, error } = await supabase
        .from('teams')
        .select('id, primary_color, secondary_color')
        .in('id', teamIds);
      
      if (error) throw error;
      
      const homeTeam = data?.find(t => t.id === lastMatch.home_team_id);
      const awayTeam = data?.find(t => t.id === lastMatch.away_team_id);
      
      return {
        homePrimary: homeTeam?.primary_color || null,
        homeSecondary: homeTeam?.secondary_color || null,
        awayPrimary: awayTeam?.primary_color || null,
        awaySecondary: awayTeam?.secondary_color || null,
      };
    },
    enabled: !!(lastMatch?.home_team_id || lastMatch?.away_team_id),
  });
  
  return {
    totalMatches: matches.length,
    teamsCount: teams.length,
    totalRallies: ralliesData || 0,
    lastMatch,
    lastMatchScores,
    homeSetsWon,
    awaySetsWon,
    teamColors: teamColorsData || null,
    loading: matchesLoading || teamsLoading,
  };
}
