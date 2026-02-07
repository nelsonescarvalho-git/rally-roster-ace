-- Function to migrate rally data from rallies table to rally_actions table
CREATE OR REPLACE FUNCTION public.migrate_rallies_to_actions()
RETURNS TABLE(migrated_rallies INTEGER, created_actions INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rally RECORD;
  v_seq INTEGER;
  v_migrated INTEGER := 0;
  v_actions INTEGER := 0;
BEGIN
  -- Loop through all rallies that don't have actions yet
  FOR v_rally IN 
    SELECT r.* 
    FROM rallies r
    WHERE r.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM rally_actions ra 
      WHERE ra.rally_id = r.id AND ra.deleted_at IS NULL
    )
  LOOP
    v_seq := 1;
    
    -- 1. SERVE action (always from serve_side)
    IF v_rally.s_player_id IS NOT NULL OR v_rally.s_code IS NOT NULL THEN
      INSERT INTO rally_actions (rally_id, sequence_no, action_type, side, player_id, player_no, code)
      VALUES (v_rally.id, v_seq, 'serve', v_rally.serve_side, v_rally.s_player_id, v_rally.s_no, v_rally.s_code);
      v_seq := v_seq + 1;
      v_actions := v_actions + 1;
    END IF;
    
    -- 2. RECEPTION action (from recv_side)
    IF v_rally.r_player_id IS NOT NULL OR v_rally.r_code IS NOT NULL THEN
      INSERT INTO rally_actions (rally_id, sequence_no, action_type, side, player_id, player_no, code)
      VALUES (v_rally.id, v_seq, 'reception', v_rally.recv_side, v_rally.r_player_id, v_rally.r_no, v_rally.r_code);
      v_seq := v_seq + 1;
      v_actions := v_actions + 1;
    END IF;
    
    -- 3. SETTER action (from recv_side)
    IF v_rally.setter_player_id IS NOT NULL OR v_rally.pass_destination IS NOT NULL THEN
      INSERT INTO rally_actions (rally_id, sequence_no, action_type, side, player_id, code, pass_destination, pass_code)
      VALUES (v_rally.id, v_seq, 'setter', v_rally.recv_side, v_rally.setter_player_id, v_rally.pass_code, v_rally.pass_destination, v_rally.pass_code);
      v_seq := v_seq + 1;
      v_actions := v_actions + 1;
    END IF;
    
    -- 4. ATTACK action (from recv_side)
    IF v_rally.a_player_id IS NOT NULL OR v_rally.a_code IS NOT NULL THEN
      INSERT INTO rally_actions (rally_id, sequence_no, action_type, side, player_id, player_no, code, kill_type, pass_destination)
      VALUES (
        v_rally.id, 
        v_seq, 
        'attack', 
        v_rally.recv_side, 
        v_rally.a_player_id, 
        v_rally.a_no, 
        v_rally.a_code, 
        v_rally.kill_type,
        v_rally.pass_destination  -- inherited destination
      );
      v_seq := v_seq + 1;
      v_actions := v_actions + 1;
    END IF;
    
    -- 5. BLOCK action (from serve_side - the defending team)
    IF v_rally.b1_player_id IS NOT NULL OR v_rally.b_code IS NOT NULL THEN
      INSERT INTO rally_actions (rally_id, sequence_no, action_type, side, player_id, player_no, code, b2_player_id, b2_no, b3_player_id, b3_no)
      VALUES (
        v_rally.id, 
        v_seq, 
        'block', 
        v_rally.serve_side, 
        v_rally.b1_player_id, 
        v_rally.b1_no, 
        v_rally.b_code,
        v_rally.b2_player_id,
        v_rally.b2_no,
        v_rally.b3_player_id,
        v_rally.b3_no
      );
      v_seq := v_seq + 1;
      v_actions := v_actions + 1;
    END IF;
    
    -- 6. DEFENSE action (from serve_side)
    IF v_rally.d_player_id IS NOT NULL OR v_rally.d_code IS NOT NULL THEN
      INSERT INTO rally_actions (rally_id, sequence_no, action_type, side, player_id, player_no, code)
      VALUES (v_rally.id, v_seq, 'defense', v_rally.serve_side, v_rally.d_player_id, v_rally.d_no, v_rally.d_code);
      v_actions := v_actions + 1;
    END IF;
    
    v_migrated := v_migrated + 1;
  END LOOP;
  
  RETURN QUERY SELECT v_migrated, v_actions;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.migrate_rallies_to_actions() IS 
'Migrates existing rally data from the rallies table to the rally_actions table. 
Only processes rallies that do not already have actions in rally_actions.
Returns count of migrated rallies and created action records.';