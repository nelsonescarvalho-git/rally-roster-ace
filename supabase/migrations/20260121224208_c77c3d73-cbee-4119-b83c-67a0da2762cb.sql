-- =============================================
-- SOFT DELETE: Adicionar colunas deleted_at e deleted_by
-- =============================================

-- Matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- Rallies
ALTER TABLE public.rallies ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.rallies ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- Lineups
ALTER TABLE public.lineups ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.lineups ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- Substitutions
ALTER TABLE public.substitutions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.substitutions ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- Match Players
ALTER TABLE public.match_players ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.match_players ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- =============================================
-- ÍNDICES para queries ativas (deleted_at IS NULL)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_matches_deleted_at ON public.matches(deleted_at);
CREATE INDEX IF NOT EXISTS idx_rallies_match_set_deleted ON public.rallies(match_id, set_no, deleted_at);
CREATE INDEX IF NOT EXISTS idx_lineups_match_set_deleted ON public.lineups(match_id, set_no, deleted_at);
CREATE INDEX IF NOT EXISTS idx_substitutions_match_set_deleted ON public.substitutions(match_id, set_no, deleted_at);
CREATE INDEX IF NOT EXISTS idx_match_players_match_deleted ON public.match_players(match_id, deleted_at);

-- =============================================
-- RPC: soft_delete_match
-- =============================================

CREATE OR REPLACE FUNCTION public.soft_delete_match(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Marcar match como apagado
  UPDATE public.matches 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE id = p_match_id AND deleted_at IS NULL;

  -- Marcar rallies
  UPDATE public.rallies 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE match_id = p_match_id AND deleted_at IS NULL;

  -- Marcar lineups
  UPDATE public.lineups 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE match_id = p_match_id AND deleted_at IS NULL;

  -- Marcar substitutions
  UPDATE public.substitutions 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE match_id = p_match_id AND deleted_at IS NULL;

  -- Marcar match_players
  UPDATE public.match_players 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE match_id = p_match_id AND deleted_at IS NULL;
END;
$$;

-- =============================================
-- RPC: soft_delete_set (substituir delete_set existente)
-- =============================================

CREATE OR REPLACE FUNCTION public.soft_delete_set(p_match_id uuid, p_set_no integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Marcar rallies do set como apagados
  UPDATE public.rallies 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE match_id = p_match_id AND set_no = p_set_no AND deleted_at IS NULL;

  -- Marcar lineups do set
  UPDATE public.lineups 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE match_id = p_match_id AND set_no = p_set_no AND deleted_at IS NULL;

  -- Marcar substitutions do set
  UPDATE public.substitutions 
  SET deleted_at = now(), deleted_by = auth.uid() 
  WHERE match_id = p_match_id AND set_no = p_set_no AND deleted_at IS NULL;
END;
$$;

-- =============================================
-- FUNÇÃO: purge_deleted (hard delete após 15 dias)
-- =============================================

CREATE OR REPLACE FUNCTION public.purge_deleted()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Apagar filhos primeiro (ordem importante para integridade referencial)
  DELETE FROM public.rallies 
  WHERE deleted_at < now() - interval '15 days';

  DELETE FROM public.lineups 
  WHERE deleted_at < now() - interval '15 days';

  DELETE FROM public.substitutions 
  WHERE deleted_at < now() - interval '15 days';

  DELETE FROM public.match_players 
  WHERE deleted_at < now() - interval '15 days';

  -- Apagar matches por último
  DELETE FROM public.matches 
  WHERE deleted_at < now() - interval '15 days';
END;
$$;