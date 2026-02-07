import type { Side, PassDestination, KillType } from './volleyball';

// Action types for the rally_actions table
export type ActionType = 'serve' | 'reception' | 'setter' | 'attack' | 'block' | 'defense';

// Database record for rally_actions table
export interface RallyActionRecord {
  id: string;
  rally_id: string;
  sequence_no: number;
  action_type: ActionType;
  side: Side;
  player_id: string | null;
  player_no: number | null;
  code: number | null;
  pass_destination: PassDestination | null;
  pass_code: number | null;
  kill_type: KillType | null;
  b2_player_id: string | null;
  b3_player_id: string | null;
  b2_no: number | null;
  b3_no: number | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

// Insert type (omit auto-generated fields)
export type RallyActionInsert = Omit<RallyActionRecord, 'id' | 'created_at' | 'deleted_at' | 'deleted_by'>;

// Update type (partial, except id)
export type RallyActionUpdate = Partial<Omit<RallyActionRecord, 'id' | 'rally_id' | 'created_at'>>;

// Action with player details (for display)
export interface RallyActionWithPlayer extends RallyActionRecord {
  player_name?: string;
  player_jersey?: number;
  b2_player_name?: string;
  b2_player_jersey?: number;
  b3_player_name?: string;
  b3_player_jersey?: number;
}

// Action code semantics for display
export const ACTION_CODE_LABELS: Record<ActionType, Record<number, { emoji: string; label: string }>> = {
  serve: {
    0: { emoji: '✗', label: 'Erro' },
    1: { emoji: '-', label: 'Fraco' },
    2: { emoji: '+', label: 'Bom' },
    3: { emoji: '⭐', label: 'Ás' },
  },
  reception: {
    0: { emoji: '✗', label: 'Má' },
    1: { emoji: '-', label: 'Fraca' },
    2: { emoji: '+', label: 'Boa' },
    3: { emoji: '⭐', label: 'Excelente' },
  },
  setter: {
    0: { emoji: '✗', label: 'Má' },
    1: { emoji: '-', label: 'Fraca' },
    2: { emoji: '+', label: 'Boa' },
    3: { emoji: '⭐', label: 'Excelente' },
  },
  attack: {
    0: { emoji: '✗', label: 'Erro' },
    1: { emoji: '□', label: 'Tocou Bloco' },
    2: { emoji: '◎', label: 'Defendido' },
    3: { emoji: '★', label: 'Kill' },
  },
  block: {
    0: { emoji: '✗', label: 'Falta' },
    1: { emoji: '↗', label: 'Ofensivo' },
    2: { emoji: '↩', label: 'Defensivo' },
    3: { emoji: '★', label: 'Ponto/Stuff' },
  },
  defense: {
    0: { emoji: '✗', label: 'Má' },
    1: { emoji: '-', label: 'Fraca' },
    2: { emoji: '+', label: 'Boa' },
    3: { emoji: '⭐', label: 'Excelente' },
  },
};

// Action type display info
export const ACTION_TYPE_INFO: Record<ActionType, { icon: string; label: string; labelPt: string }> = {
  serve: { icon: '⊙', label: 'Serve', labelPt: 'Serviço' },
  reception: { icon: '◐', label: 'Reception', labelPt: 'Receção' },
  setter: { icon: '⊕', label: 'Setter', labelPt: 'Passe' },
  attack: { icon: '⚔', label: 'Attack', labelPt: 'Ataque' },
  block: { icon: '□', label: 'Block', labelPt: 'Bloco' },
  defense: { icon: '◎', label: 'Defense', labelPt: 'Defesa' },
};
