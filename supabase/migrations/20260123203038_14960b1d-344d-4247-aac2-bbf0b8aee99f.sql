-- Tabela de sanções
CREATE TABLE public.sanctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL,
  set_no INTEGER NOT NULL,
  rally_no INTEGER NOT NULL,
  
  -- Tipo de sanção
  sanction_type TEXT NOT NULL CHECK (sanction_type IN (
    'WARNING',
    'PENALTY',
    'EXPULSION',
    'DISQUALIFICATION',
    'DELAY_WARNING',
    'DELAY_PENALTY'
  )),
  
  -- Equipa
  side TEXT NOT NULL CHECK (side IN ('CASA', 'FORA')),
  
  -- Infrator
  player_id UUID,
  player_jersey INTEGER,
  player_name TEXT,
  is_coach_staff BOOLEAN NOT NULL DEFAULT false,
  coach_staff_name TEXT,
  
  -- Efeito
  gives_point BOOLEAN NOT NULL DEFAULT false,
  gives_serve BOOLEAN NOT NULL DEFAULT false,
  removes_player BOOLEAN NOT NULL DEFAULT false,
  removal_until TEXT CHECK (removal_until IN ('SET', 'MATCH') OR removal_until IS NULL),
  
  -- Snapshot do estado
  serve_side TEXT,
  serve_rot INTEGER,
  home_score INTEGER,
  away_score INTEGER,
  court_snapshot JSONB,
  
  -- Notas
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- RLS
ALTER TABLE public.sanctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to sanctions" 
ON public.sanctions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Index para performance
CREATE INDEX idx_sanctions_match_id ON public.sanctions(match_id);
CREATE INDEX idx_sanctions_set_rally ON public.sanctions(match_id, set_no, rally_no);