-- Tabela para registar timeouts
CREATE TABLE public.timeouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL,
  set_no INTEGER NOT NULL,
  rally_no INTEGER NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('CASA', 'FORA')),
  
  -- Snapshot do momento
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  serve_side TEXT NOT NULL,
  serve_rot INTEGER NOT NULL,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- RLS
ALTER TABLE public.timeouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to timeouts" ON public.timeouts 
  FOR ALL USING (true) WITH CHECK (true);