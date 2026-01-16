-- =============================================
-- TEAMS & PERSISTENT PLAYERS MODEL
-- =============================================

-- 1. Create teams table (persistent, reusable across matches)
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to teams" ON public.teams
  FOR ALL USING (true) WITH CHECK (true);

-- 2. Create team_players table (persistent roster per team)
CREATE TABLE public.team_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  jersey_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  position TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, jersey_number)
);

-- Enable RLS
ALTER TABLE public.team_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to team_players" ON public.team_players
  FOR ALL USING (true) WITH CHECK (true);

-- 3. Add team references to matches
ALTER TABLE public.matches
  ADD COLUMN home_team_id UUID REFERENCES public.teams(id),
  ADD COLUMN away_team_id UUID REFERENCES public.teams(id);

-- 4. Create match_players table (snapshot of players for specific match)
CREATE TABLE public.match_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_player_id UUID REFERENCES public.team_players(id),
  side TEXT NOT NULL CHECK (side IN ('CASA', 'FORA')),
  jersey_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  position TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(match_id, side, jersey_number)
);

-- Enable RLS
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to match_players" ON public.match_players
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Update lineups to optionally reference match_players
-- We'll keep the existing rot1..rot6 as UUID references (they currently point to players table)
-- New matches will use match_players.id instead

-- 6. Add indexes for performance
CREATE INDEX idx_team_players_team_id ON public.team_players(team_id);
CREATE INDEX idx_match_players_match_id ON public.match_players(match_id);
CREATE INDEX idx_match_players_team_id ON public.match_players(team_id);
CREATE INDEX idx_matches_home_team_id ON public.matches(home_team_id);
CREATE INDEX idx_matches_away_team_id ON public.matches(away_team_id);