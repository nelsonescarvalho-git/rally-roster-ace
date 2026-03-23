-- Drop the old unique constraint that doesn't account for soft-deleted rows
ALTER TABLE public.rallies 
  DROP CONSTRAINT rallies_match_id_set_no_rally_no_phase_key;

-- Create partial unique index (only for non-deleted rows)
CREATE UNIQUE INDEX rallies_match_id_set_no_rally_no_phase_active_key 
  ON public.rallies (match_id, set_no, rally_no, phase) 
  WHERE deleted_at IS NULL;