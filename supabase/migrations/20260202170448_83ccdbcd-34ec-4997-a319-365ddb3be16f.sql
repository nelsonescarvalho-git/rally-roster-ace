-- Drop the old constraint and add the updated one with NET
ALTER TABLE public.rallies DROP CONSTRAINT rallies_reason_check;

ALTER TABLE public.rallies ADD CONSTRAINT rallies_reason_check 
  CHECK (reason = ANY (ARRAY['ACE'::text, 'SE'::text, 'KILL'::text, 'AE'::text, 'BLK'::text, 'DEF'::text, 'OP'::text, 'NET'::text]));