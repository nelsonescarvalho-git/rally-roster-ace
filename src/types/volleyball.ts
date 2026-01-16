export type Side = 'CASA' | 'FORA';
export type Reason = 'ACE' | 'SE' | 'KILL' | 'AE' | 'BLK' | 'DEF' | 'OP';
export type KPhase = 'K1' | 'K2' | 'K3';

export interface Match {
  id: string;
  title: string;
  match_date: string;
  home_name: string;
  away_name: string;
  first_serve_side: Side;
  created_at: string;
}

export interface Player {
  id: string;
  match_id: string;
  side: Side;
  jersey_number: number;
  name: string;
  position: string | null;
  created_at: string;
}

export interface Lineup {
  id: string;
  match_id: string;
  set_no: number;
  side: Side;
  rot1: string | null;
  rot2: string | null;
  rot3: string | null;
  rot4: string | null;
  rot5: string | null;
  rot6: string | null;
  created_at: string;
}

export interface Rally {
  id: string;
  match_id: string;
  set_no: number;
  rally_no: number;
  phase: number;
  k_phase: KPhase | null;
  serve_side: Side;
  serve_rot: number;
  recv_side: Side;
  recv_rot: number;
  point_won_by: Side | null;
  reason: Reason | null;
  s_player_id: string | null;
  s_no: number | null;
  s_code: number | null;
  r_player_id: string | null;
  r_no: number | null;
  r_code: number | null;
  a_player_id: string | null;
  a_no: number | null;
  a_code: number | null;
  b1_player_id: string | null;
  b2_player_id: string | null;
  b3_player_id: string | null;
  b1_no: number | null;
  b2_no: number | null;
  b3_no: number | null;
  b_code: number | null;
  d_player_id: string | null;
  d_no: number | null;
  d_code: number | null;
  created_at: string;
}

export interface GameState {
  matchId: string;
  currentSet: number;
  currentRally: number;
  currentPhase: number;
  serveSide: Side;
  serveRot: number;
  recvSide: Side;
  recvRot: number;
  homeScore: number;
  awayScore: number;
  detailedMode: boolean;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  jerseyNumber: number;
  side: Side;
  serveAttempts: number;
  servePoints: number;
  serveErrors: number;
  serveAvg: number;
  recAttempts: number;
  recPoints: number;
  recErrors: number;
  recAvg: number;
  attAttempts: number;
  attPoints: number;
  attErrors: number;
  attAvg: number;
  attEfficiency: number;
  blkAttempts: number;
  blkPoints: number;
  blkErrors: number;
  defAttempts: number;
  defPoints: number;
  defErrors: number;
  defAvg: number;
}

export interface RotationStats {
  rotation: number;
  side: Side;
  pointsFor: number;
  pointsAgainst: number;
  sideoutAttempts: number;
  sideoutPoints: number;
  sideoutPercent: number;
  breakAttempts: number;
  breakPoints: number;
  breakPercent: number;
}
