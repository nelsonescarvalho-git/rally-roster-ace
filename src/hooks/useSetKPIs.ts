import { useMemo } from 'react';
import { Rally, Side, MatchPlayer } from '@/types/volleyball';

interface TeamKPIs {
  // Sideout & Break
  sideoutAttempts: number;
  sideoutPoints: number;
  sideoutPercent: number;
  breakAttempts: number;
  breakPoints: number;
  breakPercent: number;
  
  // Serve
  serveTotal: number;
  serveErrors: number;
  serveErrorPercent: number;
  serveAces: number;
  serveAcePercent: number;
  servePressure: number; // code 1+2
  servePressurePercent: number;
  serveEfficiency: number; // (aces - errors) / total
  
  // Reception
  recTotal: number;
  recPerfect: number; // code 3
  recPerfectPercent: number;
  recPositive: number; // code 2+3
  recPositivePercent: number;
  recErrors: number; // code 0 (ACE suffered)
  recErrorPercent: number;
  recUnderPressure: number; // code 1
  recUnderPressurePercent: number;
  
  // Attack
  attTotal: number;
  attKills: number;
  attKillPercent: number;
  attErrors: number;
  attErrorPercent: number;
  attBlocked: number;
  attBlockedPercent: number;
  attEfficiency: number; // (kills - errors - blocked) / total
  
  // Unforced errors
  unforcedServe: number;
  unforcedAttack: number;
  unforcedOther: number;
  pointsOffered: number;
}

interface RotationBreakdown {
  rotation: number;
  attempts: number;
  points: number;
  percent: number;
}

interface RunInfo {
  side: Side;
  length: number;
  startRally: number;
  endRally: number;
}

interface ClutchInfo {
  homePoints: number;
  awayPoints: number;
  totalRallies: number;
}

interface ZoneDistribution {
  zone: string;
  count: number;
  percent: number;
}

interface TopAttacker {
  playerId: string;
  playerNo: number | null;
  playerName: string | null;
  count: number;
  percent: number;
}

interface TopServer {
  playerId: string;
  playerNo: number | null;
  playerName: string | null;
  count: number;
  percent: number;
}

export interface SetKPIs {
  home: TeamKPIs;
  away: TeamKPIs;
  
  // Insights
  longestRun: RunInfo | null;
  clutchPoints: ClutchInfo | null;
  worstRotationHome: RotationBreakdown | null;
  worstRotationAway: RotationBreakdown | null;
  
  // Distribution insights
  topZoneHome: ZoneDistribution | null;
  topZoneAway: ZoneDistribution | null;
  topAttackersHome: TopAttacker[];
  topAttackersAway: TopAttacker[];
  topServersHome: TopServer[];
  topServersAway: TopServer[];
  
  // Delta from previous set
  deltaFromPrevious?: {
    homeSideoutDelta: number;
    awaySideoutDelta: number;
  };
}

function createEmptyTeamKPIs(): TeamKPIs {
  return {
    sideoutAttempts: 0,
    sideoutPoints: 0,
    sideoutPercent: 0,
    breakAttempts: 0,
    breakPoints: 0,
    breakPercent: 0,
    serveTotal: 0,
    serveErrors: 0,
    serveErrorPercent: 0,
    serveAces: 0,
    serveAcePercent: 0,
    servePressure: 0,
    servePressurePercent: 0,
    serveEfficiency: 0,
    recTotal: 0,
    recPerfect: 0,
    recPerfectPercent: 0,
    recPositive: 0,
    recPositivePercent: 0,
    recErrors: 0,
    recErrorPercent: 0,
    recUnderPressure: 0,
    recUnderPressurePercent: 0,
    attTotal: 0,
    attKills: 0,
    attKillPercent: 0,
    attErrors: 0,
    attErrorPercent: 0,
    attBlocked: 0,
    attBlockedPercent: 0,
    attEfficiency: 0,
    unforcedServe: 0,
    unforcedAttack: 0,
    unforcedOther: 0,
    pointsOffered: 0,
  };
}

export function useSetKPIs(
  rallies: Rally[],
  setNo: number,
  previousSetRallies?: Rally[],
  players?: MatchPlayer[]
): SetKPIs {
  // Create maps of player ID to their side and metadata for accurate team identification
  const playerSideMap = useMemo(() => {
    const map: Record<string, Side> = {};
    if (players) {
      players.forEach(p => {
        map[p.id] = p.side as Side;
      });
    }
    return map;
  }, [players]);

  const playerMetaMap = useMemo(() => {
    const map: Record<string, { jerseyNumber: number; name: string }> = {};
    if (players) {
      players.forEach(p => {
        map[p.id] = { jerseyNumber: p.jersey_number, name: p.name };
      });
    }
    return map;
  }, [players]);
  return useMemo(() => {
    const rawSetRallies = rallies.filter(r => r.set_no === setNo);
    
    // Consolidate rallies by rally_no (merge multiple records for same rally)
    const consolidatedMap = new Map<number, Rally>();
    for (const rally of rawSetRallies) {
      const existing = consolidatedMap.get(rally.rally_no);
      if (!existing) {
        consolidatedMap.set(rally.rally_no, { ...rally });
      } else {
        // Merge: use non-null values from later records
        consolidatedMap.set(rally.rally_no, {
          ...existing,
          s_code: rally.s_code ?? existing.s_code,
          r_code: rally.r_code ?? existing.r_code,
          a_code: rally.a_code ?? existing.a_code,
          s_player_id: rally.s_player_id ?? existing.s_player_id,
          r_player_id: rally.r_player_id ?? existing.r_player_id,
          a_player_id: rally.a_player_id ?? existing.a_player_id,
          point_won_by: rally.point_won_by ?? existing.point_won_by,
          reason: rally.reason ?? existing.reason,
        });
      }
    }
    
    // Convert to array sorted by rally_no
    const setRallies = Array.from(consolidatedMap.values()).sort((a, b) => a.rally_no - b.rally_no);
    
    // === DEBUG LOGGING ===
    console.group(`🏐 KPI Debug - Set ${setNo}`);
    console.log(`📊 Raw rallies: ${rawSetRallies.length}, Consolidated: ${setRallies.length}`);
    console.table(setRallies.map(r => ({
      rally_no: r.rally_no,
      serve_side: r.serve_side,
      recv_side: r.recv_side,
      s_code: r.s_code,
      r_code: r.r_code,
      reason: r.reason,
      point_won_by: r.point_won_by,
    })));
    
    const home = createEmptyTeamKPIs();
    const away = createEmptyTeamKPIs();
    
    // Calculate rotation stats for worst rotation
    const rotationStats: Record<string, RotationBreakdown> = {};
    for (let rot = 1; rot <= 6; rot++) {
      rotationStats[`CASA-${rot}`] = { rotation: rot, attempts: 0, points: 0, percent: 0 };
      rotationStats[`FORA-${rot}`] = { rotation: rot, attempts: 0, points: 0, percent: 0 };
    }
    
    // Track runs
    let currentRunSide: Side | null = null;
    let currentRunLength = 0;
    let currentRunStart = 0;
    let longestRun: RunInfo | null = null;
    
    // Track clutch points (score >= 20 for either team)
    let clutchHome = 0;
    let clutchAway = 0;
    let clutchRallies = 0;
    
    let homeScore = 0;
    let awayScore = 0;
    
    for (const rally of setRallies) {
      const serveSide = rally.serve_side;
      const recvSide = rally.recv_side;
      const winner = rally.point_won_by;
      const reason = rally.reason;
      
      if (!winner) continue;
      
      // Update scores for clutch tracking
      if (winner === 'CASA') homeScore++;
      else awayScore++;
      
      // Track clutch (when either score >= 20)
      const prevHome = winner === 'CASA' ? homeScore - 1 : homeScore;
      const prevAway = winner === 'FORA' ? awayScore - 1 : awayScore;
      if (prevHome >= 20 || prevAway >= 20) {
        clutchRallies++;
        if (winner === 'CASA') clutchHome++;
        else clutchAway++;
      }
      
      // Track runs
      if (currentRunSide === winner) {
        currentRunLength++;
      } else {
        // Check if previous run was longer
        if (currentRunSide && currentRunLength > (longestRun?.length || 0)) {
          longestRun = {
            side: currentRunSide,
            length: currentRunLength,
            startRally: currentRunStart,
            endRally: rally.rally_no - 1,
          };
        }
        currentRunSide = winner;
        currentRunLength = 1;
        currentRunStart = rally.rally_no;
      }
      
      // === SIDEOUT & BREAK ===
      // When receiving (sideout opportunity)
      if (recvSide === 'CASA') {
        home.sideoutAttempts++;
        rotationStats[`CASA-${rally.recv_rot}`].attempts++;
        if (winner === 'CASA') {
          home.sideoutPoints++;
          rotationStats[`CASA-${rally.recv_rot}`].points++;
        }
      } else {
        away.sideoutAttempts++;
        rotationStats[`FORA-${rally.recv_rot}`].attempts++;
        if (winner === 'FORA') {
          away.sideoutPoints++;
          rotationStats[`FORA-${rally.recv_rot}`].points++;
        }
      }
      
      // When serving (break opportunity)
      if (serveSide === 'CASA') {
        home.breakAttempts++;
        if (winner === 'CASA') home.breakPoints++;
      } else {
        away.breakAttempts++;
        if (winner === 'FORA') away.breakPoints++;
      }
      
      // === SERVE STATS ===
      // Count ALL services, not just those with s_code
      if (serveSide === 'CASA') {
        home.serveTotal++;
        // Errors: s_code 0 OR reason SE (serve error)
        if (rally.s_code === 0 || reason === 'SE') home.serveErrors++;
        // Aces: s_code 3 OR reason ACE
        if (rally.s_code === 3 || reason === 'ACE') home.serveAces++;
        // Pressure: s_code 1 or 2 (forced difficult reception)
        if (rally.s_code === 1 || rally.s_code === 2) home.servePressure++;
      } else if (serveSide === 'FORA') {
        away.serveTotal++;
        if (rally.s_code === 0 || reason === 'SE') away.serveErrors++;
        if (rally.s_code === 3 || reason === 'ACE') away.serveAces++;
        if (rally.s_code === 1 || rally.s_code === 2) away.servePressure++;
      }
      
      // === RECEPTION STATS ===
      // Count receptions when: team received AND it wasn't a service error
      // For ACEs: count as reception error (the team tried to receive but failed)
      if (recvSide === 'CASA') {
        if (reason === 'ACE') {
          // ACE = reception attempt that failed completely
          home.recTotal++;
          home.recErrors++;
        } else if (reason !== 'SE') {
          // Normal reception (not a service error, rally was played)
          home.recTotal++;
          if (rally.r_code !== null) {
            if (rally.r_code === 3) home.recPerfect++;
            if (rally.r_code >= 2) home.recPositive++;
            if (rally.r_code === 0) home.recErrors++;
            if (rally.r_code === 1) home.recUnderPressure++;
          }
        }
        // SE = service error, no reception attempt
      } else if (recvSide === 'FORA') {
        if (reason === 'ACE') {
          away.recTotal++;
          away.recErrors++;
        } else if (reason !== 'SE') {
          away.recTotal++;
          if (rally.r_code !== null) {
            if (rally.r_code === 3) away.recPerfect++;
            if (rally.r_code >= 2) away.recPositive++;
            if (rally.r_code === 0) away.recErrors++;
            if (rally.r_code === 1) away.recUnderPressure++;
          }
        }
      }
      
      // === ATTACK STATS ===
      if (rally.a_player_id && rally.a_code !== null) {
        // Determine attacker's side
        const attSide = rally.a_player_id ? 
          (serveSide === 'CASA' ? 'FORA' : 'CASA') : // First attack is usually by receiver
          null;
        
        // We need to infer attacker side from context
        // If the rally was won by KILL, the attacker's side is the winner
        // If the rally was won by AE (attack error), the attacker's side is the loser
        let attackerSide: Side | null = null;
        if (reason === 'KILL') {
          attackerSide = winner;
        } else if (reason === 'AE') {
          attackerSide = winner === 'CASA' ? 'FORA' : 'CASA';
        } else if (reason === 'BLK') {
          // Blocked - attacker is the other side
          attackerSide = winner === 'CASA' ? 'FORA' : 'CASA';
        } else {
          // Default: assume receiver attacks in K1
          attackerSide = recvSide;
        }
        
        if (attackerSide === 'CASA') {
          home.attTotal++;
          if (rally.a_code === 3) home.attKills++;
          if (rally.a_code === 0) home.attErrors++;
          if (reason === 'BLK' && winner === 'FORA') home.attBlocked++;
        } else {
          away.attTotal++;
          if (rally.a_code === 3) away.attKills++;
          if (rally.a_code === 0) away.attErrors++;
          if (reason === 'BLK' && winner === 'CASA') away.attBlocked++;
        }
      }
      
      // === UNFORCED ERRORS ===
      if (reason === 'SE') {
        if (serveSide === 'CASA') {
          home.unforcedServe++;
          home.pointsOffered++;
        } else {
          away.unforcedServe++;
          away.pointsOffered++;
        }
      }
      if (reason === 'AE') {
        if (winner === 'CASA') {
          away.unforcedAttack++;
          away.pointsOffered++;
        } else {
          home.unforcedAttack++;
          home.pointsOffered++;
        }
      }
      if (reason === 'OP') {
        // Other point (net touch, etc) - given to opponent
        if (winner === 'CASA') {
          away.unforcedOther++;
          away.pointsOffered++;
        } else {
          home.unforcedOther++;
          home.pointsOffered++;
        }
      }
    }
    
    // Check last run
    if (currentRunSide && currentRunLength > (longestRun?.length || 0)) {
      longestRun = {
        side: currentRunSide,
        length: currentRunLength,
        startRally: currentRunStart,
        endRally: setRallies[setRallies.length - 1]?.rally_no || currentRunStart,
      };
    }
    
    // === DEBUG: Log raw counts before percentages ===
    console.log('🏠 CASA (Home) Raw Stats:');
    console.table({
      'Serve Total': home.serveTotal,
      'Serve Errors': home.serveErrors,
      'Serve Aces': home.serveAces,
      'Serve Pressure (1+2)': home.servePressure,
      'Serve Sum Check': home.serveErrors + home.serveAces + home.servePressure,
      'Reception Total': home.recTotal,
      'Rec Perfect (3)': home.recPerfect,
      'Rec Positive (2+3)': home.recPositive,
      'Rec Errors (0)': home.recErrors,
      'Rec Under Pressure (1)': home.recUnderPressure,
    });
    console.log('🚗 FORA (Away) Raw Stats:');
    console.table({
      'Serve Total': away.serveTotal,
      'Serve Errors': away.serveErrors,
      'Serve Aces': away.serveAces,
      'Serve Pressure (1+2)': away.servePressure,
      'Serve Sum Check': away.serveErrors + away.serveAces + away.servePressure,
      'Reception Total': away.recTotal,
      'Rec Perfect (3)': away.recPerfect,
      'Rec Positive (2+3)': away.recPositive,
      'Rec Errors (0)': away.recErrors,
      'Rec Under Pressure (1)': away.recUnderPressure,
    });
    
    // Calculate percentages
    const calcPercent = (num: number, den: number) => den > 0 ? Math.round((num / den) * 100) : 0;
    
    // Sideout & Break percentages
    home.sideoutPercent = calcPercent(home.sideoutPoints, home.sideoutAttempts);
    away.sideoutPercent = calcPercent(away.sideoutPoints, away.sideoutAttempts);
    home.breakPercent = calcPercent(home.breakPoints, home.breakAttempts);
    away.breakPercent = calcPercent(away.breakPoints, away.breakAttempts);
    
    // Serve percentages
    home.serveErrorPercent = calcPercent(home.serveErrors, home.serveTotal);
    away.serveErrorPercent = calcPercent(away.serveErrors, away.serveTotal);
    home.serveAcePercent = calcPercent(home.serveAces, home.serveTotal);
    away.serveAcePercent = calcPercent(away.serveAces, away.serveTotal);
    home.servePressurePercent = calcPercent(home.servePressure, home.serveTotal);
    away.servePressurePercent = calcPercent(away.servePressure, away.serveTotal);
    home.serveEfficiency = home.serveTotal > 0 ? 
      Math.round(((home.serveAces - home.serveErrors) / home.serveTotal) * 100) / 100 : 0;
    away.serveEfficiency = away.serveTotal > 0 ? 
      Math.round(((away.serveAces - away.serveErrors) / away.serveTotal) * 100) / 100 : 0;
    
    // Reception percentages
    home.recPerfectPercent = calcPercent(home.recPerfect, home.recTotal);
    away.recPerfectPercent = calcPercent(away.recPerfect, away.recTotal);
    home.recPositivePercent = calcPercent(home.recPositive, home.recTotal);
    away.recPositivePercent = calcPercent(away.recPositive, away.recTotal);
    home.recErrorPercent = calcPercent(home.recErrors, home.recTotal);
    away.recErrorPercent = calcPercent(away.recErrors, away.recTotal);
    home.recUnderPressurePercent = calcPercent(home.recUnderPressure, home.recTotal);
    away.recUnderPressurePercent = calcPercent(away.recUnderPressure, away.recTotal);
    
    // Attack percentages
    home.attKillPercent = calcPercent(home.attKills, home.attTotal);
    away.attKillPercent = calcPercent(away.attKills, away.attTotal);
    home.attErrorPercent = calcPercent(home.attErrors, home.attTotal);
    away.attErrorPercent = calcPercent(away.attErrors, away.attTotal);
    home.attBlockedPercent = calcPercent(home.attBlocked, home.attTotal);
    away.attBlockedPercent = calcPercent(away.attBlocked, away.attTotal);
    home.attEfficiency = home.attTotal > 0 ? 
      Math.round(((home.attKills - home.attErrors - home.attBlocked) / home.attTotal) * 100) / 100 : 0;
    away.attEfficiency = away.attTotal > 0 ? 
      Math.round(((away.attKills - away.attErrors - away.attBlocked) / away.attTotal) * 100) / 100 : 0;
    
    // Calculate rotation percentages and find worst
    for (const key of Object.keys(rotationStats)) {
      const stat = rotationStats[key];
      stat.percent = calcPercent(stat.points, stat.attempts);
    }
    
    // Find worst rotation for each side (with at least 2 attempts)
    const homeRotations = Object.values(rotationStats)
      .filter(r => r.attempts >= 2 && Object.keys(rotationStats).find(k => k.startsWith('CASA') && rotationStats[k] === r));
    const awayRotations = Object.values(rotationStats)
      .filter(r => r.attempts >= 2 && Object.keys(rotationStats).find(k => k.startsWith('FORA') && rotationStats[k] === r));
    
    let worstRotationHome: RotationBreakdown | null = null;
    let worstRotationAway: RotationBreakdown | null = null;
    
    for (let rot = 1; rot <= 6; rot++) {
      const homeRot = rotationStats[`CASA-${rot}`];
      const awayRot = rotationStats[`FORA-${rot}`];
      
      if (homeRot.attempts >= 2) {
        if (!worstRotationHome || homeRot.percent < worstRotationHome.percent) {
          worstRotationHome = homeRot;
        }
      }
      if (awayRot.attempts >= 2) {
        if (!worstRotationAway || awayRot.percent < worstRotationAway.percent) {
          worstRotationAway = awayRot;
        }
      }
    }
    
    // Calculate delta from previous set
    let deltaFromPrevious: SetKPIs['deltaFromPrevious'] | undefined;
    if (previousSetRallies && previousSetRallies.length > 0) {
      const prevHome = createEmptyTeamKPIs();
      const prevAway = createEmptyTeamKPIs();
      
      for (const rally of previousSetRallies) {
        if (!rally.point_won_by) continue;
        
        if (rally.recv_side === 'CASA') {
          prevHome.sideoutAttempts++;
          if (rally.point_won_by === 'CASA') prevHome.sideoutPoints++;
        } else {
          prevAway.sideoutAttempts++;
          if (rally.point_won_by === 'FORA') prevAway.sideoutPoints++;
        }
      }
      
      const prevHomeSO = calcPercent(prevHome.sideoutPoints, prevHome.sideoutAttempts);
      const prevAwaySO = calcPercent(prevAway.sideoutPoints, prevAway.sideoutAttempts);
      
      deltaFromPrevious = {
        homeSideoutDelta: home.sideoutPercent - prevHomeSO,
        awaySideoutDelta: away.sideoutPercent - prevAwaySO,
      };
    }
    
    // === DEBUG: Final percentages validation ===
    console.log('📈 Final Percentages:');
    console.log(`  CASA Serve: Erro=${home.serveErrorPercent}% + Pressão=${home.servePressurePercent}% + ACE=${home.serveAcePercent}% = ${home.serveErrorPercent + home.servePressurePercent + home.serveAcePercent}%`);
    console.log(`  FORA Serve: Erro=${away.serveErrorPercent}% + Pressão=${away.servePressurePercent}% + ACE=${away.serveAcePercent}% = ${away.serveErrorPercent + away.servePressurePercent + away.serveAcePercent}%`);
    console.log(`  CASA Rec: Erro=${home.recErrorPercent}% + Pressão=${home.recUnderPressurePercent}% + Positivo=${home.recPositivePercent}% (Perfect=${home.recPerfectPercent}%)`);
    console.log(`  FORA Rec: Erro=${away.recErrorPercent}% + Pressão=${away.recUnderPressurePercent}% + Positivo=${away.recPositivePercent}% (Perfect=${away.recPerfectPercent}%)`);
    console.groupEnd();
    
    // === DISTRIBUTION INSIGHTS ===
    // Calculate top zones and attackers by team
    const zoneCountsHome: Record<string, number> = {};
    const zoneCountsAway: Record<string, number> = {};
    const attackerCountsHome: Record<string, { count: number; playerNo: number | null }> = {};
    const attackerCountsAway: Record<string, { count: number; playerNo: number | null }> = {};
    
    // Zone distribution uses consolidated rallies (one per point)
    for (const rally of setRallies) {
      if (rally.pass_destination && rally.setter_player_id) {
        if (rally.recv_side === 'CASA') {
          zoneCountsHome[rally.pass_destination] = (zoneCountsHome[rally.pass_destination] || 0) + 1;
        } else {
          zoneCountsAway[rally.pass_destination] = (zoneCountsAway[rally.pass_destination] || 0) + 1;
        }
      }
    }
    
    // Attacker counts - use RAW rallies to count ALL attack attempts (all phases)
    // This ensures we don't lose attacks from intermediate phases
    for (const rally of rawSetRallies) {
      if (rally.a_player_id) {
        // Determine attacker's team from the player's actual side (from match_players)
        const attackerSide = playerSideMap[rally.a_player_id];
        const playerNo = rally.a_no;
        
        if (attackerSide === 'CASA') {
          if (!attackerCountsHome[rally.a_player_id]) {
            attackerCountsHome[rally.a_player_id] = { count: 0, playerNo };
          }
          attackerCountsHome[rally.a_player_id].count++;
        } else if (attackerSide === 'FORA') {
          if (!attackerCountsAway[rally.a_player_id]) {
            attackerCountsAway[rally.a_player_id] = { count: 0, playerNo };
          }
          attackerCountsAway[rally.a_player_id].count++;
        }
      }
    }
    
    // Server counts - use RAW rallies to count ALL serve attempts (all phases, but typically phase 1)
    const serverCountsHome: Record<string, { count: number; playerNo: number | null }> = {};
    const serverCountsAway: Record<string, { count: number; playerNo: number | null }> = {};
    
    for (const rally of rawSetRallies) {
      if (rally.s_player_id) {
        const serverSide = playerSideMap[rally.s_player_id];
        const playerNo = rally.s_no;
        
        if (serverSide === 'CASA') {
          if (!serverCountsHome[rally.s_player_id]) {
            serverCountsHome[rally.s_player_id] = { count: 0, playerNo };
          }
          serverCountsHome[rally.s_player_id].count++;
        } else if (serverSide === 'FORA') {
          if (!serverCountsAway[rally.s_player_id]) {
            serverCountsAway[rally.s_player_id] = { count: 0, playerNo };
          }
          serverCountsAway[rally.s_player_id].count++;
        }
      }
    }
    
    const totalZonesHome = Object.values(zoneCountsHome).reduce((a, b) => a + b, 0);
    const totalZonesAway = Object.values(zoneCountsAway).reduce((a, b) => a + b, 0);
    
    let topZoneHome: ZoneDistribution | null = null;
    let topZoneAway: ZoneDistribution | null = null;
    
    if (totalZonesHome > 0) {
      const sortedHome = Object.entries(zoneCountsHome).sort((a, b) => b[1] - a[1]);
      if (sortedHome.length > 0) {
        topZoneHome = {
          zone: sortedHome[0][0],
          count: sortedHome[0][1],
          percent: Math.round((sortedHome[0][1] / totalZonesHome) * 100),
        };
      }
    }
    
    if (totalZonesAway > 0) {
      const sortedAway = Object.entries(zoneCountsAway).sort((a, b) => b[1] - a[1]);
      if (sortedAway.length > 0) {
        topZoneAway = {
          zone: sortedAway[0][0],
          count: sortedAway[0][1],
          percent: Math.round((sortedAway[0][1] / totalZonesAway) * 100),
        };
      }
    }
    
    // Find top 3 attackers for each team
    const totalAttacksHome = Object.values(attackerCountsHome).reduce((a, b) => a + b.count, 0);
    const totalAttacksAway = Object.values(attackerCountsAway).reduce((a, b) => a + b.count, 0);
    
    const topAttackersHome: TopAttacker[] = Object.entries(attackerCountsHome)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([playerId, data]) => ({
        playerId,
        playerNo: data.playerNo,
        playerName: playerMetaMap[playerId]?.name || null,
        count: data.count,
        percent: totalAttacksHome > 0 ? Math.round((data.count / totalAttacksHome) * 100) : 0,
      }));
    
    const topAttackersAway: TopAttacker[] = Object.entries(attackerCountsAway)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([playerId, data]) => ({
        playerId,
        playerNo: data.playerNo,
        playerName: playerMetaMap[playerId]?.name || null,
        count: data.count,
        percent: totalAttacksAway > 0 ? Math.round((data.count / totalAttacksAway) * 100) : 0,
      }));
    
    // Find top 3 servers for each team
    const totalServesHome = Object.values(serverCountsHome).reduce((a, b) => a + b.count, 0);
    const totalServesAway = Object.values(serverCountsAway).reduce((a, b) => a + b.count, 0);
    
    const topServersHome: TopServer[] = Object.entries(serverCountsHome)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([playerId, data]) => ({
        playerId,
        playerNo: data.playerNo,
        playerName: playerMetaMap[playerId]?.name || null,
        count: data.count,
        percent: totalServesHome > 0 ? Math.round((data.count / totalServesHome) * 100) : 0,
      }));
    
    const topServersAway: TopServer[] = Object.entries(serverCountsAway)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([playerId, data]) => ({
        playerId,
        playerNo: data.playerNo,
        playerName: playerMetaMap[playerId]?.name || null,
        count: data.count,
        percent: totalServesAway > 0 ? Math.round((data.count / totalServesAway) * 100) : 0,
      }));
    
    return {
      home,
      away,
      longestRun,
      clutchPoints: clutchRallies > 0 ? {
        homePoints: clutchHome,
        awayPoints: clutchAway,
        totalRallies: clutchRallies,
      } : null,
      worstRotationHome,
      worstRotationAway,
      topZoneHome,
      topZoneAway,
      topAttackersHome,
      topAttackersAway,
      topServersHome,
      topServersAway,
      deltaFromPrevious,
    };
  }, [rallies, setNo, previousSetRallies, playerSideMap, playerMetaMap]);
}
