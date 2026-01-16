-- Drop old foreign key constraints on lineups that reference players table
ALTER TABLE public.lineups DROP CONSTRAINT IF EXISTS lineups_rot1_fkey;
ALTER TABLE public.lineups DROP CONSTRAINT IF EXISTS lineups_rot2_fkey;
ALTER TABLE public.lineups DROP CONSTRAINT IF EXISTS lineups_rot3_fkey;
ALTER TABLE public.lineups DROP CONSTRAINT IF EXISTS lineups_rot4_fkey;
ALTER TABLE public.lineups DROP CONSTRAINT IF EXISTS lineups_rot5_fkey;
ALTER TABLE public.lineups DROP CONSTRAINT IF EXISTS lineups_rot6_fkey;

-- Add new foreign key constraints pointing to match_players
ALTER TABLE public.lineups 
ADD CONSTRAINT lineups_rot1_fkey FOREIGN KEY (rot1) REFERENCES public.match_players(id) ON DELETE SET NULL;

ALTER TABLE public.lineups 
ADD CONSTRAINT lineups_rot2_fkey FOREIGN KEY (rot2) REFERENCES public.match_players(id) ON DELETE SET NULL;

ALTER TABLE public.lineups 
ADD CONSTRAINT lineups_rot3_fkey FOREIGN KEY (rot3) REFERENCES public.match_players(id) ON DELETE SET NULL;

ALTER TABLE public.lineups 
ADD CONSTRAINT lineups_rot4_fkey FOREIGN KEY (rot4) REFERENCES public.match_players(id) ON DELETE SET NULL;

ALTER TABLE public.lineups 
ADD CONSTRAINT lineups_rot5_fkey FOREIGN KEY (rot5) REFERENCES public.match_players(id) ON DELETE SET NULL;

ALTER TABLE public.lineups 
ADD CONSTRAINT lineups_rot6_fkey FOREIGN KEY (rot6) REFERENCES public.match_players(id) ON DELETE SET NULL;