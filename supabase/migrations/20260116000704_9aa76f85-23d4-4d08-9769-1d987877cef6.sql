-- VolleyStats Database Schema

-- Matches table
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  match_date DATE NOT NULL DEFAULT CURRENT_DATE,
  home_name TEXT NOT NULL DEFAULT 'CASA',
  away_name TEXT NOT NULL DEFAULT 'FORA',
  first_serve_side TEXT NOT NULL DEFAULT 'CASA' CHECK (first_serve_side IN ('CASA', 'FORA')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('CASA', 'FORA')),
  jersey_number INTEGER NOT NULL CHECK (jersey_number >= 0 AND jersey_number <= 99),
  name TEXT NOT NULL,
  position TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(match_id, side, jersey_number)
);

-- Lineups table
CREATE TABLE public.lineups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  set_no INTEGER NOT NULL CHECK (set_no >= 1 AND set_no <= 5),
  side TEXT NOT NULL CHECK (side IN ('CASA', 'FORA')),
  rot1 UUID REFERENCES public.players(id) ON DELETE SET NULL,
  rot2 UUID REFERENCES public.players(id) ON DELETE SET NULL,
  rot3 UUID REFERENCES public.players(id) ON DELETE SET NULL,
  rot4 UUID REFERENCES public.players(id) ON DELETE SET NULL,
  rot5 UUID REFERENCES public.players(id) ON DELETE SET NULL,
  rot6 UUID REFERENCES public.players(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(match_id, set_no, side)
);

-- Rallies table
CREATE TABLE public.rallies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  set_no INTEGER NOT NULL CHECK (set_no >= 1 AND set_no <= 5),
  rally_no INTEGER NOT NULL CHECK (rally_no >= 1),
  phase INTEGER NOT NULL DEFAULT 1 CHECK (phase >= 1),
  k_phase TEXT CHECK (k_phase IN ('K1', 'K2', 'K3')),
  serve_side TEXT NOT NULL CHECK (serve_side IN ('CASA', 'FORA')),
  serve_rot INTEGER NOT NULL CHECK (serve_rot >= 1 AND serve_rot <= 6),
  recv_side TEXT NOT NULL CHECK (recv_side IN ('CASA', 'FORA')),
  recv_rot INTEGER NOT NULL CHECK (recv_rot >= 1 AND recv_rot <= 6),
  point_won_by TEXT CHECK (point_won_by IN ('CASA', 'FORA')),
  reason TEXT CHECK (reason IN ('ACE', 'SE', 'KILL', 'AE', 'BLK', 'DEF', 'OP')),
  -- Serve stats
  s_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  s_no INTEGER,
  s_code INTEGER CHECK (s_code >= 0 AND s_code <= 3),
  -- Reception stats
  r_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  r_no INTEGER,
  r_code INTEGER CHECK (r_code >= 0 AND r_code <= 3),
  -- Attack stats
  a_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  a_no INTEGER,
  a_code INTEGER CHECK (a_code >= 0 AND a_code <= 3),
  -- Block stats (up to 3 blockers)
  b1_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  b2_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  b3_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  b1_no INTEGER,
  b2_no INTEGER,
  b3_no INTEGER,
  b_code INTEGER CHECK (b_code >= 0 AND b_code <= 3),
  -- Defense stats
  d_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  d_no INTEGER,
  d_code INTEGER CHECK (d_code >= 0 AND d_code <= 3),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(match_id, set_no, rally_no, phase),
  CHECK (serve_side != recv_side)
);

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rallies ENABLE ROW LEVEL SECURITY;

-- Public access policies (single user app, no auth required)
CREATE POLICY "Allow all access to matches" ON public.matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to players" ON public.players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to lineups" ON public.lineups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to rallies" ON public.rallies FOR ALL USING (true) WITH CHECK (true);

-- Indexes for better performance
CREATE INDEX idx_players_match_side ON public.players(match_id, side);
CREATE INDEX idx_lineups_match_set ON public.lineups(match_id, set_no);
CREATE INDEX idx_rallies_match_set ON public.rallies(match_id, set_no);
CREATE INDEX idx_rallies_match_set_rally ON public.rallies(match_id, set_no, rally_no);