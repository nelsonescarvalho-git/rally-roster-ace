
-- Recriar soft_delete_set com rally_actions, timeouts, sanctions
CREATE OR REPLACE FUNCTION public.soft_delete_set(p_match_id uuid, p_set_no integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.rally_actions ra
  SET deleted_at = now(), deleted_by = auth.uid()
  FROM public.rallies r
  WHERE ra.rally_id = r.id
    AND r.match_id = p_match_id
    AND r.set_no = p_set_no
    AND ra.deleted_at IS NULL;

  UPDATE public.rallies 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE match_id = p_match_id AND set_no = p_set_no AND deleted_at IS NULL;

  UPDATE public.lineups 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE match_id = p_match_id AND set_no = p_set_no AND deleted_at IS NULL;

  UPDATE public.substitutions 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE match_id = p_match_id AND set_no = p_set_no AND deleted_at IS NULL;

  UPDATE public.timeouts 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE match_id = p_match_id AND set_no = p_set_no AND deleted_at IS NULL;

  UPDATE public.sanctions 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE match_id = p_match_id AND set_no = p_set_no AND deleted_at IS NULL;
END;
$$;

-- Recriar soft_delete_match com rally_actions, timeouts, sanctions
CREATE OR REPLACE FUNCTION public.soft_delete_match(p_match_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.rally_actions ra
  SET deleted_at = now(), deleted_by = auth.uid()
  FROM public.rallies r
  WHERE ra.rally_id = r.id
    AND r.match_id = p_match_id
    AND ra.deleted_at IS NULL;

  UPDATE public.matches 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE id = p_match_id AND deleted_at IS NULL;

  UPDATE public.rallies 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE match_id = p_match_id AND deleted_at IS NULL;

  UPDATE public.lineups 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE match_id = p_match_id AND deleted_at IS NULL;

  UPDATE public.substitutions 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE match_id = p_match_id AND deleted_at IS NULL;

  UPDATE public.match_players 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE match_id = p_match_id AND deleted_at IS NULL;

  UPDATE public.timeouts 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE match_id = p_match_id AND deleted_at IS NULL;

  UPDATE public.sanctions 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE match_id = p_match_id AND deleted_at IS NULL;
END;
$$;

-- Recriar purge_deleted com rally_actions, timeouts, sanctions
CREATE OR REPLACE FUNCTION public.purge_deleted()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.rally_actions 
  WHERE deleted_at < now() - interval '15 days';

  DELETE FROM public.timeouts 
  WHERE deleted_at < now() - interval '15 days';

  DELETE FROM public.sanctions 
  WHERE deleted_at < now() - interval '15 days';

  DELETE FROM public.rallies 
  WHERE deleted_at < now() - interval '15 days';

  DELETE FROM public.lineups 
  WHERE deleted_at < now() - interval '15 days';

  DELETE FROM public.substitutions 
  WHERE deleted_at < now() - interval '15 days';

  DELETE FROM public.match_players 
  WHERE deleted_at < now() - interval '15 days';

  DELETE FROM public.matches 
  WHERE deleted_at < now() - interval '15 days';
END;
$$;
