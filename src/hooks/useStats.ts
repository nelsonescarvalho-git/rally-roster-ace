import { useMemo } from 'react';
import { Rally, Player, MatchPlayer, PlayerStats, RotationStats, Side } from '@/types/volleyball';

export function useStats(rallies: Rally[], players: (Player | MatchPlayer)[]) {
  const playerStats = useMemo(() => {
    const stats: Record<string, PlayerStats> = {};

    players.forEach(player => {
      stats[player.id] = {
        playerId: player.id,
        playerName: player.name,
        jerseyNumber: player.jersey_number,
        side: player.side,
        serveAttempts: 0,
        servePoints: 0,
        serveErrors: 0,
        serveAvg: 0,
        recAttempts: 0,
        recPoints: 0,
        recErrors: 0,
        recAvg: 0,
        attAttempts: 0,
        attPoints: 0,
        attErrors: 0,
        attAvg: 0,
        attEfficiency: 0,
        blkAttempts: 0,
        blkPoints: 0,
        blkErrors: 0,
        defAttempts: 0,
        defPoints: 0,
        defErrors: 0,
        defAvg: 0,
      };
    });

    // Get final phases only
    const finalPhases = rallies.reduce((acc, rally) => {
      const key = `${rally.set_no}-${rally.rally_no}`;
      if (!acc[key] || rally.phase > acc[key].phase) {
        acc[key] = rally;
      }
      return acc;
    }, {} as Record<string, Rally>);

    Object.values(finalPhases).forEach(rally => {
      // Serve
      if (rally.s_player_id && rally.s_code !== null && stats[rally.s_player_id]) {
        stats[rally.s_player_id].serveAttempts++;
        if (rally.s_code === 3) stats[rally.s_player_id].servePoints++;
        if (rally.s_code === 0) stats[rally.s_player_id].serveErrors++;
      }

      // Reception
      if (rally.r_player_id && rally.r_code !== null && stats[rally.r_player_id]) {
        stats[rally.r_player_id].recAttempts++;
        if (rally.r_code === 3) stats[rally.r_player_id].recPoints++;
        if (rally.r_code === 0) stats[rally.r_player_id].recErrors++;
      }

      // Attack
      if (rally.a_player_id && rally.a_code !== null && stats[rally.a_player_id]) {
        stats[rally.a_player_id].attAttempts++;
        if (rally.a_code === 3) stats[rally.a_player_id].attPoints++;
        if (rally.a_code === 0) stats[rally.a_player_id].attErrors++;
      }

      // Block
      if (rally.b_code !== null) {
        [rally.b1_player_id, rally.b2_player_id, rally.b3_player_id].forEach(pid => {
          if (pid && stats[pid]) {
            stats[pid].blkAttempts++;
            if (rally.b_code === 3) stats[pid].blkPoints++;
            if (rally.b_code === 0) stats[pid].blkErrors++;
          }
        });
      }

      // Defense
      if (rally.d_player_id && rally.d_code !== null && stats[rally.d_player_id]) {
        stats[rally.d_player_id].defAttempts++;
        if (rally.d_code === 3) stats[rally.d_player_id].defPoints++;
        if (rally.d_code === 0) stats[rally.d_player_id].defErrors++;
      }
    });

    // Calculate averages
    Object.values(stats).forEach(s => {
      if (s.serveAttempts > 0) {
        s.serveAvg = (s.servePoints * 3 + (s.serveAttempts - s.servePoints - s.serveErrors) * 1.5) / s.serveAttempts;
      }
      if (s.recAttempts > 0) {
        s.recAvg = (s.recPoints * 3 + (s.recAttempts - s.recPoints - s.recErrors) * 1.5) / s.recAttempts;
      }
      if (s.attAttempts > 0) {
        s.attAvg = (s.attPoints * 3 + (s.attAttempts - s.attPoints - s.attErrors) * 1.5) / s.attAttempts;
        s.attEfficiency = (s.attPoints - s.attErrors) / s.attAttempts;
      }
      if (s.defAttempts > 0) {
        s.defAvg = (s.defPoints * 3 + (s.defAttempts - s.defPoints - s.defErrors) * 1.5) / s.defAttempts;
      }
    });

    return Object.values(stats);
  }, [rallies, players]);

  const rotationStats = useMemo(() => {
    const stats: Record<string, RotationStats> = {};

    ['CASA', 'FORA'].forEach(side => {
      [1, 2, 3, 4, 5, 6].forEach(rot => {
        stats[`${side}-${rot}`] = {
          rotation: rot,
          side: side as Side,
          pointsFor: 0,
          pointsAgainst: 0,
          sideoutAttempts: 0,
          sideoutPoints: 0,
          sideoutPercent: 0,
          breakAttempts: 0,
          breakPoints: 0,
          breakPercent: 0,
        };
      });
    });

    // Get final phases only
    const finalPhases = rallies.reduce((acc, rally) => {
      const key = `${rally.set_no}-${rally.rally_no}`;
      if (!acc[key] || rally.phase > acc[key].phase) {
        acc[key] = rally;
      }
      return acc;
    }, {} as Record<string, Rally>);

    Object.values(finalPhases).forEach(rally => {
      if (!rally.point_won_by) return;

      const serveKey = `${rally.serve_side}-${rally.serve_rot}`;
      const recvKey = `${rally.recv_side}-${rally.recv_rot}`;

      // Serving team stats
      stats[serveKey].breakAttempts++;
      if (rally.point_won_by === rally.serve_side) {
        stats[serveKey].breakPoints++;
        stats[serveKey].pointsFor++;
      } else {
        stats[serveKey].pointsAgainst++;
      }

      // Receiving team stats
      stats[recvKey].sideoutAttempts++;
      if (rally.point_won_by === rally.recv_side) {
        stats[recvKey].sideoutPoints++;
        stats[recvKey].pointsFor++;
      } else {
        stats[recvKey].pointsAgainst++;
      }
    });

    // Calculate percentages
    Object.values(stats).forEach(s => {
      if (s.sideoutAttempts > 0) {
        s.sideoutPercent = (s.sideoutPoints / s.sideoutAttempts) * 100;
      }
      if (s.breakAttempts > 0) {
        s.breakPercent = (s.breakPoints / s.breakAttempts) * 100;
      }
    });

    return Object.values(stats);
  }, [rallies]);

  return { playerStats, rotationStats };
}
