-- Backfill r_player_id for rallies where it's NULL but r_no and recv_side exist
-- This will match players by match_id + side + jersey_number

UPDATE public.rallies r
SET r_player_id = mp.id
FROM public.match_players mp
WHERE r.r_player_id IS NULL
  AND r.r_no IS NOT NULL
  AND r.recv_side IS NOT NULL
  AND mp.match_id = r.match_id
  AND mp.side = r.recv_side
  AND mp.jersey_number = r.r_no;