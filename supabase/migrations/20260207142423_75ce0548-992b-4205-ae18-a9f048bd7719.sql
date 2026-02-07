-- Create rally_actions table for unlimited sequential actions per rally
CREATE TABLE public.rally_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rally_id UUID NOT NULL REFERENCES rallies(id) ON DELETE CASCADE,
  sequence_no INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  side TEXT NOT NULL,
  player_id UUID REFERENCES match_players(id),
  player_no INTEGER,
  code INTEGER,
  pass_destination TEXT,
  pass_code INTEGER,
  kill_type TEXT,
  b2_player_id UUID REFERENCES match_players(id),
  b3_player_id UUID REFERENCES match_players(id),
  b2_no INTEGER,
  b3_no INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  UNIQUE(rally_id, sequence_no)
);

-- Enable RLS
ALTER TABLE public.rally_actions ENABLE ROW LEVEL SECURITY;

-- Create policy for all access (matching existing tables pattern)
CREATE POLICY "Allow all access to rally_actions"
  ON public.rally_actions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for common queries
CREATE INDEX idx_rally_actions_rally_id ON public.rally_actions(rally_id);
CREATE INDEX idx_rally_actions_player_id ON public.rally_actions(player_id);
CREATE INDEX idx_rally_actions_action_type ON public.rally_actions(action_type);

-- Add comment for documentation
COMMENT ON TABLE public.rally_actions IS 'Stores individual actions within a rally, allowing unlimited sequential actions per rally. The rallies table remains as summary/result.';
COMMENT ON COLUMN public.rally_actions.sequence_no IS 'Order within the rally (1, 2, 3...)';
COMMENT ON COLUMN public.rally_actions.action_type IS 'Type: serve, reception, setter, attack, block, defense';
COMMENT ON COLUMN public.rally_actions.side IS 'CASA or FORA';
COMMENT ON COLUMN public.rally_actions.code IS 'Quality/result code 0-3';