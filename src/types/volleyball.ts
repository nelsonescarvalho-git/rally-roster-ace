export type Side = 'CASA' | 'FORA';
export type Reason = 'ACE' | 'SE' | 'KILL' | 'AE' | 'BLK' | 'DEF' | 'OP';
export type KPhase = 'K1' | 'K2' | 'K3';
export type KillType = 'FLOOR' | 'BLOCKOUT';

// Persistent team (reusable across matches)
export interface Team {
  id: string;
  name: string;
  created_at: string;
}

// Persistent player in a team roster
export interface TeamPlayer {
  id: string;
  team_id: string;
  jersey_number: number;
  name: string;
  position: string | null;
  active: boolean;
  created_at: string;
}

// Match with optional team references
export interface Match {
  id: string;
  title: string;
  match_date: string;
  home_name: string;
  away_name: string;
  first_serve_side: Side;
  home_team_id: string | null;
  away_team_id: string | null;
  created_at: string;
}

// Snapshot of a player for a specific match
export interface MatchPlayer {
  id: string;
  match_id: string;
  team_id: string;
  team_player_id: string | null;
  side: Side;
  jersey_number: number;
  name: string;
  position: string | null;
  created_at: string;
}

// Legacy Player interface (for backwards compatibility)
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

export interface Substitution {
  id: string;
  match_id: string;
  set_no: number;
  side: Side;
  rally_no: number;
  player_out_id: string;
  player_in_id: string;
  is_libero: boolean;
  created_at: string;
}

export type PassDestination = 'P2' | 'P3' | 'P4' | 'OP' | 'PIPE' | 'BACK' | 'OUTROS';

// Available attack positions based on reception quality
export const POSITIONS_BY_RECEPTION: Record<number, PassDestination[]> = {
  3: ['P2', 'P3', 'P4', 'OP', 'PIPE'],  // 5 opções - receção excelente
  2: ['P2', 'P4', 'OP', 'PIPE'],         // 4 opções - receção boa
  1: ['P2', 'P4', 'OP'],                 // 3 opções - receção fraca
  0: ['BACK', 'OUTROS'],                 // 2 opções - receção má
};

export const RECEPTION_LABELS: Record<number, { emoji: string; label: string }> = {
  3: { emoji: '⭐', label: 'Excelente' },
  2: { emoji: '+', label: 'Boa' },
  1: { emoji: '-', label: 'Fraca' },
  0: { emoji: '✗', label: 'Má' },
};

// Attack difficulty based on distribution quality (pass_code)
export const ATTACK_DIFFICULTY_BY_DISTRIBUTION: Record<number, {
  label: string;
  emoji: string;
  difficulty: string;
  expectedKillRate: number;
}> = {
  3: { label: 'Excelente', emoji: '⭐', difficulty: 'Fácil', expectedKillRate: 0.50 },
  2: { label: 'Boa', emoji: '+', difficulty: 'Normal', expectedKillRate: 0.35 },
  1: { label: 'Fraca', emoji: '-', difficulty: 'Difícil', expectedKillRate: 0.20 },
  0: { label: 'Má', emoji: '✗', difficulty: 'Muito Difícil', expectedKillRate: 0.10 },
};

export const DISTRIBUTION_LABELS: Record<number, { emoji: string; label: string }> = {
  3: { emoji: '⭐', label: 'Excelente' },
  2: { emoji: '+', label: 'Boa' },
  1: { emoji: '-', label: 'Fraca' },
  0: { emoji: '✗', label: 'Má' },
};

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
  setter_player_id: string | null;
  pass_destination: PassDestination | null;
  pass_code: number | null;
  kill_type: KillType | null;
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
  attFloorKills: number;
  attBlockoutKills: number;
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
