import { useMemo, useCallback } from 'react';
import { Side, Player, MatchPlayer, Substitution } from '@/types/volleyball';

interface UseLiberoTrackingProps {
  matchId: string | null;
  currentSet: number;
  side: Side;
  currentRally: number;
  rotation: number;
  isReceiving: boolean;
  substitutions: Substitution[];
  getPlayersForSide: (side: Side) => (Player | MatchPlayer)[];
  getPlayersOnCourt: (setNo: number, side: Side, currentRally: number) => (Player | MatchPlayer)[];
  getPlayerZone: (setNo: number, side: Side, playerId: string, rotation: number, currentRally: number) => number | null;
  makeSubstitution: (setNo: number, side: Side, rallyNo: number, playerOutId: string, playerInId: string, isLibero: boolean) => Promise<boolean>;
}

export function useLiberoTracking({
  matchId,
  currentSet,
  side,
  currentRally,
  rotation,
  isReceiving,
  substitutions,
  getPlayersForSide,
  getPlayersOnCourt,
  getPlayerZone,
  makeSubstitution,
}: UseLiberoTrackingProps) {
  
  // Get all liberos for this side from the team roster
  const availableLiberos = useMemo(() => {
    const allPlayers = getPlayersForSide(side);
    return allPlayers.filter(p => 
      p.position?.toUpperCase() === 'L' || 
      p.position?.toUpperCase() === 'LIBERO'
    );
  }, [getPlayersForSide, side]);
  
  // Calculate libero limit based on team size (12 players = 1 libero, 14 players = 2 liberos)
  const liberoLimit = useMemo(() => {
    const teamSize = getPlayersForSide(side).length;
    return teamSize >= 14 ? 2 : 1;
  }, [getPlayersForSide, side]);
  
  // Get all libero substitutions for this set and side
  const liberoSubstitutions = useMemo(() => {
    return substitutions
      .filter(s => s.set_no === currentSet && s.side === side && s.is_libero)
      .sort((a, b) => a.rally_no - b.rally_no || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [substitutions, currentSet, side]);
  
  // Compute current libero state by replaying all libero subs
  const currentLiberoState = useMemo((): { 
    isOnCourt: boolean; 
    liberoId: string | null;
    replacedPlayerId: string | null;
    entryRallyNo: number | null;
  } => {
    // Filter subs up to current rally
    const relevantSubs = liberoSubstitutions.filter(s => s.rally_no <= currentRally);
    
    if (relevantSubs.length === 0) {
      return { isOnCourt: false, liberoId: null, replacedPlayerId: null, entryRallyNo: null };
    }
    
    // Replay substitutions to compute current state
    // Entry: libero is player_in, regular player is player_out
    // Exit: regular player is player_in, libero is player_out
    const liberoIds = new Set(availableLiberos.map(l => l.id));
    
    let activeLiberoId: string | null = null;
    let replacedPlayerId: string | null = null;
    let entryRallyNo: number | null = null;
    
    for (const sub of relevantSubs) {
      const inIsLibero = liberoIds.has(sub.player_in_id);
      const outIsLibero = liberoIds.has(sub.player_out_id);
      
      if (inIsLibero && !outIsLibero) {
        // Libero entering - replace a regular player
        activeLiberoId = sub.player_in_id;
        replacedPlayerId = sub.player_out_id;
        entryRallyNo = sub.rally_no;
      } else if (outIsLibero && !inIsLibero) {
        // Libero exiting - regular player returns
        activeLiberoId = null;
        replacedPlayerId = null;
        entryRallyNo = null;
      }
    }
    
    return { 
      isOnCourt: activeLiberoId !== null, 
      liberoId: activeLiberoId, 
      replacedPlayerId,
      entryRallyNo
    };
  }, [liberoSubstitutions, currentRally, availableLiberos]);
  
  // Get players eligible for libero substitution (back row: Z1, Z5, Z6)
  const eligibleForLiberoEntry = useMemo(() => {
    if (availableLiberos.length === 0) return [];
    if (currentLiberoState.isOnCourt) return []; // Already on court
    
    const onCourt = getPlayersOnCourt(currentSet, side, currentRally);
    const liberoIds = new Set(availableLiberos.map(l => l.id));
    
    // Filter for back row players (Z1, Z5, Z6) - all eligible for libero replacement
    return onCourt.filter(player => {
      if (liberoIds.has(player.id)) return false; // Exclude liberos themselves
      const zone = getPlayerZone(currentSet, side, player.id, rotation, currentRally);
      return zone !== null && [1, 5, 6].includes(zone);
    });
  }, [availableLiberos, currentLiberoState.isOnCourt, getPlayersOnCourt, currentSet, side, currentRally, getPlayerZone, rotation]);
  
  // Check if libero should be prompted to enter (team is receiving and libero not on court)
  const shouldPromptLiberoEntry = useMemo(() => {
    if (availableLiberos.length === 0) return false;
    if (currentLiberoState.isOnCourt) return false;
    if (!isReceiving) return false;
    if (eligibleForLiberoEntry.length === 0) return false;
    return true;
  }, [availableLiberos, currentLiberoState.isOnCourt, isReceiving, eligibleForLiberoEntry]);
  
  // Calculate if the replaced player has rotated to Z4 (libero must exit)
  const mustExitLibero = useMemo(() => {
    if (!currentLiberoState.isOnCourt || !currentLiberoState.replacedPlayerId) return false;
    
    // Get the zone the replaced player WOULD be in if they were on court
    // We need to calculate based on lineup position, not active lineup (since libero is there)
    const zone = getPlayerZone(currentSet, side, currentLiberoState.replacedPlayerId, rotation, currentRally);
    
    // If zone calculation fails (player not in lineup), check if libero's zone is 4
    if (zone === null) {
      // Fallback: check libero's current zone
      const liberoZone = getPlayerZone(currentSet, side, currentLiberoState.liberoId!, rotation, currentRally);
      return liberoZone === 4;
    }
    
    return zone === 4;
  }, [currentLiberoState, getPlayerZone, currentSet, side, rotation, currentRally]);
  
  // Get the player who should return when libero exits
  const playerToReturn = useMemo((): (Player | MatchPlayer) | null => {
    if (!currentLiberoState.replacedPlayerId) return null;
    const allPlayers = getPlayersForSide(side);
    return allPlayers.find(p => p.id === currentLiberoState.replacedPlayerId) || null;
  }, [currentLiberoState.replacedPlayerId, getPlayersForSide, side]);
  
  // Enter libero on court
  const enterLibero = useCallback(async (
    liberoId: string, 
    replacedPlayerId: string
  ): Promise<boolean> => {
    if (!matchId) return false;
    return await makeSubstitution(
      currentSet,
      side,
      currentRally,
      replacedPlayerId,  // Player going out
      liberoId,          // Libero coming in
      true               // is_libero = true
    );
  }, [matchId, currentSet, side, currentRally, makeSubstitution]);
  
  // Exit libero from court
  const exitLibero = useCallback(async (): Promise<boolean> => {
    if (!matchId || !currentLiberoState.isOnCourt) return false;
    if (!currentLiberoState.liberoId || !currentLiberoState.replacedPlayerId) return false;
    
    return await makeSubstitution(
      currentSet,
      side,
      currentRally,
      currentLiberoState.liberoId,        // Libero going out
      currentLiberoState.replacedPlayerId, // Original player coming in
      true                                  // is_libero = true
    );
  }, [matchId, currentSet, side, currentRally, currentLiberoState, makeSubstitution]);
  
  // Get active libero player object
  const activeLiberoPlayer = useMemo((): (Player | MatchPlayer) | null => {
    if (!currentLiberoState.liberoId) return null;
    return availableLiberos.find(l => l.id === currentLiberoState.liberoId) || null;
  }, [currentLiberoState.liberoId, availableLiberos]);
  
  // Get recommended player for libero entry (MB in back row has priority)
  const recommendedPlayerForLibero = useMemo((): (Player | MatchPlayer) | null => {
    if (eligibleForLiberoEntry.length === 0) return null;
    
    // Priority: Middle Blocker (MB/C/CENTRAL) in back row
    const mb = eligibleForLiberoEntry.find(p => {
      const pos = p.position?.toUpperCase() || '';
      return ['MB', 'C', 'CENTRAL'].includes(pos);
    });
    
    if (mb) return mb;
    
    // Fallback: first eligible player (usually Z1 after serving)
    return eligibleForLiberoEntry[0];
  }, [eligibleForLiberoEntry]);
  
  return {
    // State
    isLiberoOnCourt: currentLiberoState.isOnCourt,
    activeLiberoPlayer,
    replacedPlayerId: currentLiberoState.replacedPlayerId,
    
    // Available liberos
    availableLiberos,
    liberoLimit,
    
    // Eligibility
    eligibleForLiberoEntry,
    recommendedPlayerForLibero,
    
    // Prompts
    shouldPromptLiberoEntry,
    mustExitLibero,
    playerToReturn,
    
    // Actions
    enterLibero,
    exitLibero,
  };
}
