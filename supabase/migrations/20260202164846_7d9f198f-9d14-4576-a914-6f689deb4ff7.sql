-- Add fault tracking columns to rallies table
ALTER TABLE public.rallies 
  ADD COLUMN IF NOT EXISTS fault_player_id UUID,
  ADD COLUMN IF NOT EXISTS fault_no INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN rallies.fault_player_id IS 'Jogador que cometeu falta (rede, toque na rede, invasão)';
COMMENT ON COLUMN rallies.fault_no IS 'Número do jogador que cometeu a falta';

-- Add foreign key constraint
ALTER TABLE public.rallies
  ADD CONSTRAINT rallies_fault_player_id_fkey 
  FOREIGN KEY (fault_player_id) 
  REFERENCES match_players(id) 
  ON DELETE SET NULL;