-- Drop old foreign key constraints on rallies that reference players table
ALTER TABLE public.rallies DROP CONSTRAINT IF EXISTS rallies_s_player_id_fkey;
ALTER TABLE public.rallies DROP CONSTRAINT IF EXISTS rallies_r_player_id_fkey;
ALTER TABLE public.rallies DROP CONSTRAINT IF EXISTS rallies_a_player_id_fkey;
ALTER TABLE public.rallies DROP CONSTRAINT IF EXISTS rallies_b1_player_id_fkey;
ALTER TABLE public.rallies DROP CONSTRAINT IF EXISTS rallies_b2_player_id_fkey;
ALTER TABLE public.rallies DROP CONSTRAINT IF EXISTS rallies_b3_player_id_fkey;
ALTER TABLE public.rallies DROP CONSTRAINT IF EXISTS rallies_d_player_id_fkey;

-- Add new foreign key constraints pointing to match_players
ALTER TABLE public.rallies 
ADD CONSTRAINT rallies_s_player_id_fkey FOREIGN KEY (s_player_id) REFERENCES public.match_players(id) ON DELETE SET NULL;

ALTER TABLE public.rallies 
ADD CONSTRAINT rallies_r_player_id_fkey FOREIGN KEY (r_player_id) REFERENCES public.match_players(id) ON DELETE SET NULL;

ALTER TABLE public.rallies 
ADD CONSTRAINT rallies_a_player_id_fkey FOREIGN KEY (a_player_id) REFERENCES public.match_players(id) ON DELETE SET NULL;

ALTER TABLE public.rallies 
ADD CONSTRAINT rallies_b1_player_id_fkey FOREIGN KEY (b1_player_id) REFERENCES public.match_players(id) ON DELETE SET NULL;

ALTER TABLE public.rallies 
ADD CONSTRAINT rallies_b2_player_id_fkey FOREIGN KEY (b2_player_id) REFERENCES public.match_players(id) ON DELETE SET NULL;

ALTER TABLE public.rallies 
ADD CONSTRAINT rallies_b3_player_id_fkey FOREIGN KEY (b3_player_id) REFERENCES public.match_players(id) ON DELETE SET NULL;

ALTER TABLE public.rallies 
ADD CONSTRAINT rallies_d_player_id_fkey FOREIGN KEY (d_player_id) REFERENCES public.match_players(id) ON DELETE SET NULL;