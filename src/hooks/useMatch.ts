import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Match, Player, Lineup, Rally, Side, GameState } from '@/types/volleyball';
import { useToast } from '@/hooks/use-toast';

export function useMatch(matchId: string | null) {
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [rallies, setRallies] = useState<Rally[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMatch = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    try {
      const [matchRes, playersRes, lineupsRes, ralliesRes] = await Promise.all([
        supabase.from('matches').select('*').eq('id', matchId).maybeSingle(),
        supabase.from('players').select('*').eq('match_id', matchId).order('jersey_number'),
        supabase.from('lineups').select('*').eq('match_id', matchId),
        supabase.from('rallies').select('*').eq('match_id', matchId).order('set_no').order('rally_no').order('phase'),
      ]);

      if (matchRes.data) setMatch(matchRes.data as Match);
      if (playersRes.data) setPlayers(playersRes.data as Player[]);
      if (lineupsRes.data) setLineups(lineupsRes.data as Lineup[]);
      if (ralliesRes.data) setRallies(ralliesRes.data as Rally[]);
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar jogo', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [matchId, toast]);

  const getPlayersForSide = useCallback((side: Side) => {
    return players.filter(p => p.side === side);
  }, [players]);

  const getLineupForSet = useCallback((setNo: number, side: Side) => {
    return lineups.find(l => l.set_no === setNo && l.side === side);
  }, [lineups]);

  const getRalliesForSet = useCallback((setNo: number) => {
    return rallies.filter(r => r.set_no === setNo);
  }, [rallies]);

  const getServerPlayer = useCallback((setNo: number, side: Side, rotation: number): Player | null => {
    const lineup = getLineupForSet(setNo, side);
    if (!lineup) return null;
    const rotKey = `rot${rotation}` as keyof Lineup;
    const playerId = lineup[rotKey] as string | null;
    return players.find(p => p.id === playerId) || null;
  }, [getLineupForSet, players]);

  const calculateScore = useCallback((setNo: number): { home: number; away: number } => {
    const setRallies = getRalliesForSet(setNo);
    const finalPhases = setRallies.reduce((acc, rally) => {
      const key = `${rally.rally_no}`;
      if (!acc[key] || rally.phase > acc[key].phase) {
        acc[key] = rally;
      }
      return acc;
    }, {} as Record<string, Rally>);

    let home = 0;
    let away = 0;
    Object.values(finalPhases).forEach(rally => {
      if (rally.point_won_by === 'CASA') home++;
      else if (rally.point_won_by === 'FORA') away++;
    });
    return { home, away };
  }, [getRalliesForSet]);

  const getGameState = useCallback((setNo: number): GameState | null => {
    if (!match) return null;

    const setRallies = getRalliesForSet(setNo);
    const { home, away } = calculateScore(setNo);

    if (setRallies.length === 0) {
      const homeLineup = getLineupForSet(setNo, 'CASA');
      const awayLineup = getLineupForSet(setNo, 'FORA');
      if (!homeLineup || !awayLineup) return null;

      return {
        matchId: match.id,
        currentSet: setNo,
        currentRally: 1,
        currentPhase: 1,
        serveSide: match.first_serve_side,
        serveRot: 1,
        recvSide: match.first_serve_side === 'CASA' ? 'FORA' : 'CASA',
        recvRot: 1,
        homeScore: 0,
        awayScore: 0,
        detailedMode: false,
      };
    }

    // Find last completed rally (with point_won_by)
    const completedRallies = setRallies.filter(r => r.point_won_by);
    const lastRally = completedRallies.length > 0 
      ? completedRallies[completedRallies.length - 1]
      : null;

    // Check if there's an ongoing multi-phase rally
    const maxRallyNo = Math.max(...setRallies.map(r => r.rally_no));
    const currentRallyPhases = setRallies.filter(r => r.rally_no === maxRallyNo);
    const hasOngoingPhase = currentRallyPhases.some(r => !r.point_won_by);

    if (hasOngoingPhase) {
      const ongoingRally = currentRallyPhases[0];
      const maxPhase = Math.max(...currentRallyPhases.map(r => r.phase));
      return {
        matchId: match.id,
        currentSet: setNo,
        currentRally: maxRallyNo,
        currentPhase: maxPhase + 1,
        serveSide: ongoingRally.serve_side,
        serveRot: ongoingRally.serve_rot,
        recvSide: ongoingRally.recv_side,
        recvRot: ongoingRally.recv_rot,
        homeScore: home,
        awayScore: away,
        detailedMode: true,
      };
    }

    if (!lastRally) {
      return {
        matchId: match.id,
        currentSet: setNo,
        currentRally: 1,
        currentPhase: 1,
        serveSide: match.first_serve_side,
        serveRot: 1,
        recvSide: match.first_serve_side === 'CASA' ? 'FORA' : 'CASA',
        recvRot: 1,
        homeScore: 0,
        awayScore: 0,
        detailedMode: false,
      };
    }

    // Calculate next state based on who won
    const isSideout = lastRally.point_won_by === lastRally.recv_side;
    let nextServeSide: Side;
    let nextServeRot: number;
    let nextRecvSide: Side;
    let nextRecvRot: number;

    if (isSideout) {
      // Receiver won - they become server and rotate
      nextServeSide = lastRally.recv_side;
      nextServeRot = lastRally.recv_rot === 6 ? 1 : lastRally.recv_rot + 1;
      nextRecvSide = lastRally.serve_side;
      nextRecvRot = lastRally.serve_rot;
    } else {
      // Server won - keep serving, no rotation
      nextServeSide = lastRally.serve_side;
      nextServeRot = lastRally.serve_rot;
      nextRecvSide = lastRally.recv_side;
      nextRecvRot = lastRally.recv_rot;
    }

    return {
      matchId: match.id,
      currentSet: setNo,
      currentRally: lastRally.rally_no + 1,
      currentPhase: 1,
      serveSide: nextServeSide,
      serveRot: nextServeRot,
      recvSide: nextRecvSide,
      recvRot: nextRecvRot,
      homeScore: home,
      awayScore: away,
      detailedMode: false,
    };
  }, [match, getRalliesForSet, calculateScore, getLineupForSet]);

  const saveRally = useCallback(async (rallyData: Partial<Rally>) => {
    try {
      const { error } = await supabase.from('rallies').insert([rallyData as any]);
      if (error) throw error;
      await loadMatch();
      return true;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }
  }, [loadMatch, toast]);

  const updateRally = useCallback(async (rallyId: string, updates: Partial<Rally>) => {
    try {
      const { error } = await supabase.from('rallies').update(updates).eq('id', rallyId);
      if (error) throw error;
      await loadMatch();
      return true;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }
  }, [loadMatch, toast]);

  const deleteLastRally = useCallback(async (setNo: number) => {
    const setRallies = getRalliesForSet(setNo);
    if (setRallies.length === 0) return false;
    
    const lastRallyNo = Math.max(...setRallies.map(r => r.rally_no));
    const lastPhase = Math.max(...setRallies.filter(r => r.rally_no === lastRallyNo).map(r => r.phase));
    
    try {
      const { error } = await supabase
        .from('rallies')
        .delete()
        .eq('match_id', matchId)
        .eq('set_no', setNo)
        .eq('rally_no', lastRallyNo)
        .eq('phase', lastPhase);
      if (error) throw error;
      await loadMatch();
      toast({ title: 'Anulado', description: 'Último ponto removido' });
      return true;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }
  }, [matchId, getRalliesForSet, loadMatch, toast]);

  return {
    match,
    players,
    lineups,
    rallies,
    loading,
    loadMatch,
    getPlayersForSide,
    getLineupForSet,
    getRalliesForSet,
    getServerPlayer,
    calculateScore,
    getGameState,
    saveRally,
    updateRally,
    deleteLastRally,
  };
}
