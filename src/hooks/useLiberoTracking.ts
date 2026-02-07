import { useMemo, useCallback } from 'react';
import { Side, Player, MatchPlayer, Substitution } from '@/types/volleyball';

interface UseLiberoTrackingProps {
  matchId: string | null;
  currentSet: number;
  side: Side;
  currentRally: number;
  rotation: number;
  isReceiving: boolean;
  isSetStart: boolean; // true when currentRally === 1 (allows serving team to enter libero)
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
  isSetStart,
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
  
  // Get players eligible for libero substitution (back row: Z1, Z5, Z6 for receiving, Z5, Z6 for serving at set start)
  const eligibleForLiberoEntry = useMemo(() => {
    if (availableLiberos.length === 0) return [];
    if (currentLiberoState.isOnCourt) return []; // Already on court
    
    const onCourt = getPlayersOnCourt(currentSet, side, currentRally);
    const liberoIds = new Set(availableLiberos.map(l => l.id));
    
    // Eligible zones depend on whether team is receiving or serving
    // Receiving team: Z1, Z5, Z6 (full back row)
    // Serving team (only at set start): Z5, Z6 (Z1 is serving, shouldn't be replaced)
    const eligibleZones = isReceiving ? [1, 5, 6] : [5, 6];
    
    // Filter for back row players based on eligibility
    return onCourt.filter(player => {
      if (liberoIds.has(player.id)) return false; // Exclude liberos themselves
      const zone = getPlayerZone(currentSet, side, player.id, rotation, currentRally);
      return zone !== null && eligibleZones.includes(zone);
    });
  }, [availableLiberos, currentLiberoState.isOnCourt, getPlayersOnCourt, currentSet, side, currentRally, getPlayerZone, rotation, isReceiving]);
  
  // Check if libero should be prompted to enter
  // - Receiving team: always eligible when libero not on court
  // - Serving team: only at set start (rally 1) to allow initial libero entry
  const shouldPromptLiberoEntry = useMemo(() => {
    if (availableLiberos.length === 0) return false;
    if (currentLiberoState.isOnCourt) return false;
    if (eligibleForLiberoEntry.length === 0) return false;
    
    // Allow entry if receiving OR if it's set start (rally 1)
    if (!isReceiving && !isSetStart) return false;
    
    return true;
  }, [availableLiberos, currentLiberoState.isOnCourt, isReceiving, isSetStart, eligibleForLiberoEntry]);
  
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
  
  // Check if can swap libero for another libero (L-L substitution)
  const canSwapLibero = useMemo(() => {
    if (!currentLiberoState.isOnCourt) return false;
    if (availableLiberos.length < 2) return false;
    
    // The other libero that's not on court
    const otherLibero = availableLiberos.find(
      l => l.id !== currentLiberoState.liberoId
    );
    return !!otherLibero;
  }, [currentLiberoState.isOnCourt, currentLiberoState.liberoId, availableLiberos]);
  
  // Get the other available libero for L-L swap
  const otherAvailableLibero = useMemo((): (Player | MatchPlayer) | null => {
    if (!currentLiberoState.liberoId) return null;
    return availableLiberos.find(l => l.id !== currentLiberoState.liberoId) || null;
  }, [currentLiberoState.liberoId, availableLiberos]);
  
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
  
  // Swap libero for another libero (L-L substitution - unlimited)
  const swapLibero = useCallback(async (
    newLiberoId: string
  ): Promise<boolean> => {
    if (!matchId || !currentLiberoState.isOnCourt) return false;
    if (!currentLiberoState.liberoId || !currentLiberoState.replacedPlayerId) return false;
    
    // L-L swap is recorded as two substitutions:
    // 1. Current libero out -> Original player in
    // 2. Original player out -> New libero in
    
    // First: exit current libero
    const exitSuccess = await makeSubstitution(
      currentSet,
      side,
      currentRally,
      currentLiberoState.liberoId,        // Current libero going out
      currentLiberoState.replacedPlayerId, // Original player coming in (temporarily)
      true                                  // is_libero = true
    );
    
    if (!exitSuccess) return false;
    
    // Second: enter new libero
    const entrySuccess = await makeSubstitution(
      currentSet,
      side,
      currentRally,
      currentLiberoState.replacedPlayerId, // Original player going out
      newLiberoId,                          // New libero coming in
      true                                  // is_libero = true
    );
    
    return entrySuccess;
  }, [matchId, currentLiberoState, currentSet, side, currentRally, makeSubstitution]);
  
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
    
    // L-L Swap
    canSwapLibero,
    otherAvailableLibero,
    
    // Actions
    enterLibero,
    exitLibero,
    swapLibero,
  };
}
