-- Add setter and pass destination columns to rallies table
ALTER TABLE public.rallies 
ADD COLUMN IF NOT EXISTS setter_player_id uuid REFERENCES public.match_players(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pass_destination text;

-- Add comment explaining valid pass_destination values
COMMENT ON COLUMN public.rallies.pass_destination IS 'Distribution zone: P2, P3, P4, OP, PIPE, BACK, OUTROS';