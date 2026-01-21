-- Criar função RPC para apagar set
CREATE OR REPLACE FUNCTION delete_set(p_match_id uuid, p_set_no integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Apagar rallies do set
  DELETE FROM rallies 
  WHERE match_id = p_match_id AND set_no = p_set_no;
  
  -- Apagar substituições do set
  DELETE FROM substitutions 
  WHERE match_id = p_match_id AND set_no = p_set_no;
  
  -- Apagar lineup do set
  DELETE FROM lineups 
  WHERE match_id = p_match_id AND set_no = p_set_no;
END;
$$;