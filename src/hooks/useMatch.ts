import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Match, Player, MatchPlayer, Lineup, Rally, Side, GameState, Substitution } from '@/types/volleyball';
import { useToast } from '@/hooks/use-toast';

export function useMatch(matchId: string | null) {
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayer[]>([]);
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [rallies, setRallies] = useState<Rally[]>([]);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMatch = useCallback(async () => {
    if (!matchId) return;
    setLoading(true);
    try {
      const [matchRes, playersRes, matchPlayersRes, lineupsRes, ralliesRes, subsRes] = await Promise.all([
        supabase.from('matches').select('*').eq('id', matchId).maybeSingle(),
        supabase.from('players').select('*').eq('match_id', matchId).order('jersey_number'),
        supabase.from('match_players').select('*').eq('match_id', matchId).order('jersey_number'),
        supabase.from('lineups').select('*').eq('match_id', matchId),
        supabase.from('rallies').select('*').eq('match_id', matchId).order('set_no').order('rally_no').order('phase'),
        supabase.from('substitutions').select('*').eq('match_id', matchId).order('created_at'),
      ]);

      if (matchRes.data) setMatch(matchRes.data as Match);
      if (playersRes.data) setPlayers(playersRes.data as Player[]);
      if (matchPlayersRes.data) setMatchPlayers(matchPlayersRes.data as MatchPlayer[]);
      if (lineupsRes.data) setLineups(lineupsRes.data as Lineup[]);
      if (ralliesRes.data) setRallies(ralliesRes.data as Rally[]);
      if (subsRes.data) setSubstitutions(subsRes.data as Substitution[]);
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar jogo', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [matchId, toast]);

  // Get effective players: prefer match_players, fallback to legacy players
  const getEffectivePlayers = useCallback((): (Player | MatchPlayer)[] => {
    if (matchPlayers.length > 0) {
      return matchPlayers;
    }
    return players;
  }, [matchPlayers, players]);

  const getPlayersForSide = useCallback((side: Side): (Player | MatchPlayer)[] => {
    const effectivePlayers = getEffectivePlayers();
    return effectivePlayers.filter(p => p.side === side);
  }, [getEffectivePlayers]);

  const getLineupForSet = useCallback((setNo: number, side: Side) => {
    return lineups.find(l => l.set_no === setNo && l.side === side);
  }, [lineups]);

  const getRalliesForSet = useCallback((setNo: number) => {
    return rallies.filter(r => r.set_no === setNo);
  }, [rallies]);

  const getServerPlayer = useCallback((setNo: number, side: Side, rotation: number): (Player | MatchPlayer) | null => {
    const lineup = getLineupForSet(setNo, side);
    if (!lineup) return null;
    const rotKey = `rot${rotation}` as keyof Lineup;
    const playerId = lineup[rotKey] as string | null;
    const effectivePlayers = getEffectivePlayers();
    return effectivePlayers.find(p => p.id === playerId) || null;
  }, [getLineupForSet, getEffectivePlayers]);

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

  // Check if a set is complete based on volleyball rules
  const isSetComplete = useCallback((setNo: number): { 
    complete: boolean; 
    winner: Side | null;
    homeScore: number;
    awayScore: number;
  } => {
    const { home, away } = calculateScore(setNo);
    const targetPoints = setNo === 5 ? 15 : 25;
    const margin = Math.abs(home - away);
    
    // Set ends when someone reaches target AND has 2+ point advantage
    if (home >= targetPoints && margin >= 2 && home > away) {
      return { complete: true, winner: 'CASA', homeScore: home, awayScore: away };
    }
    if (away >= targetPoints && margin >= 2 && away > home) {
      return { complete: true, winner: 'FORA', homeScore: home, awayScore: away };
    }
    
    return { complete: false, winner: null, homeScore: home, awayScore: away };
  }, [calculateScore]);

  // Get overall match status
  const getMatchStatus = useCallback((): {
    setsHome: number;
    setsAway: number;
    matchComplete: boolean;
    matchWinner: Side | null;
    setResults: Array<{ setNo: number; home: number; away: number; winner: Side | null; complete: boolean }>;
  } => {
    let setsHome = 0;
    let setsAway = 0;
    const setResults: Array<{ setNo: number; home: number; away: number; winner: Side | null; complete: boolean }> = [];
    
    for (let s = 1; s <= 5; s++) {
      const result = isSetComplete(s);
      setResults.push({ setNo: s, home: result.homeScore, away: result.awayScore, winner: result.winner, complete: result.complete });
      if (result.winner === 'CASA') setsHome++;
      else if (result.winner === 'FORA') setsAway++;
    }
    
    const matchComplete = setsHome >= 3 || setsAway >= 3;
    const matchWinner = matchComplete ? (setsHome >= 3 ? 'CASA' : 'FORA') : null;
    
    return { setsHome, setsAway, matchComplete, matchWinner, setResults };
  }, [isSetComplete]);

  // Helper: Calculate who serves first in each set (alternates)
  const getFirstServeForSet = useCallback((setNo: number): Side => {
    if (!match) return 'CASA';
    // Odd sets (1, 3, 5): first_serve_side
    // Even sets (2, 4): opposite team
    if (setNo % 2 === 1) {
      return match.first_serve_side;
    } else {
      return match.first_serve_side === 'CASA' ? 'FORA' : 'CASA';
    }
  }, [match]);

  const getGameState = useCallback((setNo: number): GameState | null => {
    if (!match) return null;

    const setRallies = getRalliesForSet(setNo);
    const { home, away } = calculateScore(setNo);
    const firstServe = getFirstServeForSet(setNo);

    if (setRallies.length === 0) {
      const homeLineup = getLineupForSet(setNo, 'CASA');
      const awayLineup = getLineupForSet(setNo, 'FORA');
      if (!homeLineup || !awayLineup) return null;

      return {
        matchId: match.id,
        currentSet: setNo,
        currentRally: 1,
        currentPhase: 1,
        serveSide: firstServe,
        serveRot: 1,
        recvSide: firstServe === 'CASA' ? 'FORA' : 'CASA',
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
    
    // Find the LAST phase of the current rally (highest phase number)
    const maxPhase = Math.max(...currentRallyPhases.map(r => r.phase));
    const lastPhaseRally = currentRallyPhases.find(r => r.phase === maxPhase);
    
    // Rally is ongoing ONLY if the LAST phase doesn't have point_won_by
    const hasOngoingPhase = lastPhaseRally && !lastPhaseRally.point_won_by;

    if (hasOngoingPhase) {
      const ongoingRally = currentRallyPhases[0];
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
        serveSide: firstServe,
        serveRot: 1,
        recvSide: firstServe === 'CASA' ? 'FORA' : 'CASA',
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
  }, [match, getRalliesForSet, calculateScore, getLineupForSet, getFirstServeForSet]);

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
    
    try {
      // Delete ALL phases of the last rally (entire rally), not just the last phase
      const { error } = await supabase
        .from('rallies')
        .delete()
        .eq('match_id', matchId)
        .eq('set_no', setNo)
        .eq('rally_no', lastRallyNo);
      if (error) throw error;
      await loadMatch();
      toast({ title: 'Anulado', description: 'Rally completo removido' });
      return true;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }
  }, [matchId, getRalliesForSet, loadMatch, toast]);

  // ============ SUBSTITUTION LOGIC ============

  // Get substitutions for a specific set and side
  const getSubstitutionsForSet = useCallback((setNo: number, side: Side): Substitution[] => {
    return substitutions.filter(s => s.set_no === setNo && s.side === side);
  }, [substitutions]);

  // Count regular (non-libero) substitutions used
  const getSubstitutionsUsed = useCallback((setNo: number, side: Side): number => {
    return substitutions.filter(s => s.set_no === setNo && s.side === side && !s.is_libero).length;
  }, [substitutions]);

  // Get active lineup considering substitutions up to a specific rally
  const getActiveLineup = useCallback((setNo: number, side: Side, upToRally: number): string[] => {
    const lineup = getLineupForSet(setNo, side);
    if (!lineup) return [];

    // Start with the base lineup
    let activePlayerIds = [
      lineup.rot1,
      lineup.rot2,
      lineup.rot3,
      lineup.rot4,
      lineup.rot5,
      lineup.rot6,
    ].filter(Boolean) as string[];

    // Apply substitutions up to the current rally
    const relevantSubs = substitutions
      .filter(s => s.set_no === setNo && s.side === side && s.rally_no <= upToRally)
      .sort((a, b) => a.rally_no - b.rally_no);

    for (const sub of relevantSubs) {
      const outIndex = activePlayerIds.indexOf(sub.player_out_id);
      if (outIndex !== -1) {
        activePlayerIds[outIndex] = sub.player_in_id;
      }
    }

    return activePlayerIds;
  }, [getLineupForSet, substitutions]);

  // Get players currently on court
  const getPlayersOnCourt = useCallback((setNo: number, side: Side, currentRally: number): (Player | MatchPlayer)[] => {
    const activeIds = getActiveLineup(setNo, side, currentRally);
    const effectivePlayers = getEffectivePlayers();
    return activeIds
      .map(id => effectivePlayers.find(p => p.id === id))
      .filter(Boolean) as (Player | MatchPlayer)[];
  }, [getActiveLineup, getEffectivePlayers]);

  // Get players on bench (not currently on court)
  const getPlayersOnBench = useCallback((setNo: number, side: Side, currentRally: number): (Player | MatchPlayer)[] => {
    const activeIds = getActiveLineup(setNo, side, currentRally);
    const allSidePlayers = getPlayersForSide(side);
    return allSidePlayers.filter(p => !activeIds.includes(p.id));
  }, [getActiveLineup, getPlayersForSide]);

  // Make a substitution
  const makeSubstitution = useCallback(async (
    setNo: number,
    side: Side,
    rallyNo: number,
    playerOutId: string,
    playerInId: string,
    isLibero: boolean
  ): Promise<boolean> => {
    if (!matchId) return false;

    try {
      const { error } = await supabase.from('substitutions').insert([{
        match_id: matchId,
        set_no: setNo,
        side: side,
        rally_no: rallyNo,
        player_out_id: playerOutId,
        player_in_id: playerInId,
        is_libero: isLibero,
      }]);
      if (error) throw error;
      await loadMatch();
      toast({ 
        title: isLibero ? 'Entrada Libero' : 'Substituição', 
        description: 'Registada com sucesso' 
      });
      return true;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }
  }, [matchId, loadMatch, toast]);

  // Undo a substitution
  const undoSubstitution = useCallback(async (subId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('substitutions').delete().eq('id', subId);
      if (error) throw error;
      await loadMatch();
      toast({ title: 'Substituição anulada' });
      return true;
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }
  }, [loadMatch, toast]);

  return {
    match,
    players,
    matchPlayers,
    lineups,
    rallies,
    substitutions,
    loading,
    loadMatch,
    getPlayersForSide,
    getEffectivePlayers,
    getLineupForSet,
    getRalliesForSet,
    getServerPlayer,
    calculateScore,
    isSetComplete,
    getMatchStatus,
    getGameState,
    saveRally,
    updateRally,
    deleteLastRally,
    // Substitution functions
    getSubstitutionsForSet,
    getSubstitutionsUsed,
    getActiveLineup,
    getPlayersOnCourt,
    getPlayersOnBench,
    makeSubstitution,
    undoSubstitution,
  };
}
