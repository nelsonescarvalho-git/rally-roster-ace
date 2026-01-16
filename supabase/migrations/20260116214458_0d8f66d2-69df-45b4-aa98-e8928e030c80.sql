-- Add kill_type column to track how kills happen (direct to floor vs block-out)
ALTER TABLE public.rallies 
ADD COLUMN kill_type text 
CHECK (kill_type IN ('FLOOR', 'BLOCKOUT') OR kill_type IS NULL);

COMMENT ON COLUMN public.rallies.kill_type IS 'Type of KILL: FLOOR (direct to floor) or BLOCKOUT (tool/block-out)';