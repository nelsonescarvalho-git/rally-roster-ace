-- Create substitutions table to track player changes during sets
CREATE TABLE public.substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  set_no INTEGER NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('CASA', 'FORA')),
  rally_no INTEGER NOT NULL,
  player_out_id UUID NOT NULL REFERENCES match_players(id) ON DELETE CASCADE,
  player_in_id UUID NOT NULL REFERENCES match_players(id) ON DELETE CASCADE,
  is_libero BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.substitutions ENABLE ROW LEVEL SECURITY;

-- Allow all access (matching existing tables pattern)
CREATE POLICY "Allow all access to substitutions" 
ON public.substitutions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Index for efficient queries
CREATE INDEX idx_substitutions_match_set ON public.substitutions(match_id, set_no);
CREATE INDEX idx_substitutions_rally ON public.substitutions(match_id, set_no, rally_no);