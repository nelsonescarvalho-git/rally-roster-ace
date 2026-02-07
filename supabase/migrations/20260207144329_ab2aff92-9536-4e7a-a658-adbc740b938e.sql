-- Add new columns to teams table
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS coach_name TEXT,
ADD COLUMN IF NOT EXISTS assistant_coach TEXT,
ADD COLUMN IF NOT EXISTS team_manager TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add new columns to team_players table
ALTER TABLE public.team_players 
ADD COLUMN IF NOT EXISTS height_cm INTEGER,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS federation_id TEXT,
ADD COLUMN IF NOT EXISTS is_captain BOOLEAN DEFAULT false;