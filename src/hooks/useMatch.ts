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
        supabase.from('matches').select('*').eq('id', matchId).is('deleted_at', null).maybeSingle(),
        supabase.from('players').select('*').eq('match_id', matchId).order('jersey_number'),
        supabase.from('match_players').select('*').eq('match_id', matchId).is('deleted_at', null).order('jersey_number'),
        supabase.from('lineups').select('*').eq('match_id', matchId).is('deleted_at', null),
        supabase.from('rallies').select('*').eq('match_id', matchId).is('deleted_at', null).order('set_no').order('rally_no').order('phase'),
        supabase.from('substitutions').select('*').eq('match_id', matchId).is('deleted_at', null).order('created_at'),
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

  // Helper: Calculate who serves first in each set (alternates, except 5th set = coin toss)
  const getFirstServeForSet = useCallback((setNo: number): Side | null => {
    if (!match) return 'CASA';
    
    // 5th set: coin toss - use set5_serve_side if defined, otherwise null (needs choice)
    if (setNo === 5) {
      return (match as any).set5_serve_side as Side | null;
    }
    
    // Sets 1-4: alternation pattern
    // Odd sets (1, 3): first_serve_side
    // Even sets (2, 4): opposite team
    if (setNo % 2 === 1) {
      return match.first_serve_side;
    } else {
      return match.first_serve_side === 'CASA' ? 'FORA' : 'CASA';
    }
  }, [match]);

  // Set who serves first in the 5th set (after coin toss)
  const setFifthSetServe = useCallback(async (side: Side) => {
    if (!match) return;
    
    const { error } = await supabase
      .from('matches')
      .update({ set5_serve_side: side } as any)
      .eq('id', match.id);
      
    if (!error) {
      await loadMatch();
    }
  }, [match, loadMatch]);

  // Check if 5th set needs serve selection
  const needsFifthSetServeChoice = useCallback((setNo: number): boolean => {
    if (!match || setNo !== 5) return false;
    return !(match as any).set5_serve_side;
  }, [match]);

  const getGameState = useCallback((setNo: number): GameState | null => {
    if (!match) return null;

    const setRallies = getRalliesForSet(setNo);
    const { home, away } = calculateScore(setNo);
    const firstServe = getFirstServeForSet(setNo);
    
    // If 5th set and no serve choice made yet, return null (needs user choice)
    if (setNo === 5 && firstServe === null) {
      return null;
    }

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

    // Apply substitutions up to the current rally (stable sort by rally_no, created_at, id)
    const relevantSubs = substitutions
      .filter(s => s.set_no === setNo && s.side === side && s.rally_no <= upToRally)
      .sort((a, b) => {
        if (a.rally_no !== b.rally_no) return a.rally_no - b.rally_no;
        // Secondary sort by created_at for deterministic order
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        if (timeA !== timeB) return timeA - timeB;
        // Fallback to id comparison
        return a.id.localeCompare(b.id);
      });

    for (const sub of relevantSubs) {
      const outIndex = activePlayerIds.indexOf(sub.player_out_id);
      if (outIndex !== -1) {
        activePlayerIds[outIndex] = sub.player_in_id;
      }
    }

    return activePlayerIds;
  }, [getLineupForSet, substitutions]);

  // Get the player serving based on active lineup (considers substitutions)
  const getServerPlayer = useCallback((setNo: number, side: Side, rotation: number, currentRally: number): (Player | MatchPlayer) | null => {
    // Use active lineup that considers substitutions
    const activeIds = getActiveLineup(setNo, side, currentRally);
    if (activeIds.length === 0) return null;
    
    // The player at index (rotation - 1) is at Z1 (serving position)
    const serverIndex = rotation - 1;
    const playerId = activeIds[serverIndex];
    if (!playerId) return null;
    
    const effectivePlayers = getEffectivePlayers();
    return effectivePlayers.find(p => p.id === playerId) || null;
  }, [getActiveLineup, getEffectivePlayers]);

  // Get players currently on court
  const getPlayersOnCourt = useCallback((setNo: number, side: Side, currentRally: number): (Player | MatchPlayer)[] => {
    const activeIds = getActiveLineup(setNo, side, currentRally);
    const effectivePlayers = getEffectivePlayers();
    return activeIds
      .map(id => effectivePlayers.find(p => p.id === id))
      .filter(Boolean) as (Player | MatchPlayer)[];
  }, [getActiveLineup, getEffectivePlayers]);

  // Get current zone (Z1-Z6) for a player based on lineup and rotation
  const getPlayerZone = useCallback((setNo: number, side: Side, playerId: string, rotation: number, currentRally: number): number | null => {
    const lineup = getLineupForSet(setNo, side);
    if (!lineup) return null;

    // Get current active lineup with substitutions
    const activeIds = getActiveLineup(setNo, side, currentRally);
    
    // Find player's position in the lineup (0-5)
    const lineupIndex = activeIds.findIndex(id => id === playerId);
    if (lineupIndex === -1) return null;

    // Calculate the zone based on rotation
    // rotation=1 means rot1 is at Z1 (serving)
    // rotation=2 means rot2 is at Z1 (serving)
    // Zone = ((lineupIndex - (rotation - 1) + 6) % 6) + 1
    const zone = ((lineupIndex - (rotation - 1) + 6) % 6) + 1;
    return zone;
  }, [getLineupForSet, getActiveLineup]);

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

  // Auto-fix missing player IDs based on jersey numbers
  const autoFixMissingPlayerIds = useCallback(async (): Promise<{ fixed: number; errors: number }> => {
    if (!matchId) return { fixed: 0, errors: 0 };
    
    const effectivePlayers = getEffectivePlayers();
    let fixed = 0;
    let errors = 0;
    
    // Find rallies with missing player IDs but have jersey numbers
    const ralliesToFix = rallies.filter(r => 
      // Serve: has s_no but no s_player_id
      (r.s_no !== null && !r.s_player_id) ||
      // Reception: has r_no but no r_player_id
      (r.r_no !== null && !r.r_player_id) ||
      // Attack: has a_no but no a_player_id
      (r.a_no !== null && !r.a_player_id) ||
      // Defense: has d_no but no d_player_id
      (r.d_no !== null && !r.d_player_id) ||
      // Block: has b1_no but no b1_player_id
      (r.b1_no !== null && !r.b1_player_id) ||
      // Setter: has pass_destination but no setter_player_id
      (r.pass_destination && !r.setter_player_id)
    );

    for (const rally of ralliesToFix) {
      const updates: Partial<Rally> = {};

      // Fix s_player_id
      if (rally.s_no !== null && !rally.s_player_id) {
        const player = effectivePlayers.find(p => 
          p.jersey_number === rally.s_no && p.side === rally.serve_side
        );
        if (player) updates.s_player_id = player.id;
      }

      // Fix r_player_id
      if (rally.r_no !== null && !rally.r_player_id) {
        const player = effectivePlayers.find(p => 
          p.jersey_number === rally.r_no && p.side === rally.recv_side
        );
        if (player) updates.r_player_id = player.id;
      }

      // Fix a_player_id - determine side based on k_phase
      // K3 = transition/counter attack (serve side attacks), K1/K2 = reception side attacks
      if (rally.a_no !== null && !rally.a_player_id) {
        const attackSide = rally.k_phase === 'K3'
          ? rally.serve_side
          : rally.recv_side;
        const player = effectivePlayers.find(p => 
          p.jersey_number === rally.a_no && p.side === attackSide
        );
        if (player) updates.a_player_id = player.id;
      }

      // Fix d_player_id - defense is on opposite side of attack
      if (rally.d_no !== null && !rally.d_player_id) {
        const attackSide = rally.k_phase === 'K3'
          ? rally.serve_side
          : rally.recv_side;
        const defSide = attackSide === 'CASA' ? 'FORA' : 'CASA';
        const player = effectivePlayers.find(p => 
          p.jersey_number === rally.d_no && p.side === defSide
        );
        if (player) updates.d_player_id = player.id;
      }

      // Fix b1_player_id - block is on opposite side of attack
      if (rally.b1_no !== null && !rally.b1_player_id) {
        const attackSide = rally.k_phase === 'K3'
          ? rally.serve_side
          : rally.recv_side;
        const blockSide = attackSide === 'CASA' ? 'FORA' : 'CASA';
        const player = effectivePlayers.find(p => 
          p.jersey_number === rally.b1_no && p.side === blockSide
        );
        if (player) updates.b1_player_id = player.id;
      }

      // Fix setter_player_id - setter is on attacking side, find player with position 'S'
      if (rally.pass_destination && !rally.setter_player_id) {
        const attackSide = rally.phase % 2 === 1 ? rally.recv_side : rally.serve_side;
        // First try to find a setter (position 'S')
        let setter = effectivePlayers.find(p => 
          p.side === attackSide && p.position === 'S'
        );
        // If no setter found, try libero (position 'L') - sometimes acts as setter in back row
        if (!setter) {
          setter = effectivePlayers.find(p => 
            p.side === attackSide && p.position === 'L'
          );
        }
        if (setter) updates.setter_player_id = setter.id;
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        try {
          const { error } = await supabase
            .from('rallies')
            .update(updates)
            .eq('id', rally.id);
          if (error) {
            errors++;
          } else {
            fixed++;
          }
        } catch {
          errors++;
        }
      }
    }

    // Reload data after fixes
    if (fixed > 0) {
      await loadMatch();
    }

    return { fixed, errors };
  }, [matchId, rallies, getEffectivePlayers, loadMatch]);

  // Auto-fix missing kill types - default to FLOOR for kills without kill_type
  const autoFixMissingKillTypes = useCallback(async () => {
    if (!matchId) return { fixed: 0, errors: 0 };
    
    let fixed = 0;
    let errors = 0;
    
    // Find rallies with a_code === 3 (kill) but no kill_type
    const ralliesToFix = rallies.filter(r => 
      r.a_code === 3 && !r.kill_type
    );

    for (const rally of ralliesToFix) {
      try {
        const { error } = await supabase
          .from('rallies')
          .update({ kill_type: 'FLOOR' })
          .eq('id', rally.id);
        if (error) {
          errors++;
        } else {
          fixed++;
        }
      } catch {
        errors++;
      }
    }

    // Reload data after fixes
    if (fixed > 0) {
      await loadMatch();
    }

    return { fixed, errors };
  }, [matchId, rallies, loadMatch]);

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
    getPlayerZone,
    getPlayersOnBench,
    makeSubstitution,
    undoSubstitution,
    // Auto-fix
    autoFixMissingPlayerIds,
    autoFixMissingKillTypes,
    // 5th set serve choice
    setFifthSetServe,
    needsFifthSetServeChoice,
  };
}
