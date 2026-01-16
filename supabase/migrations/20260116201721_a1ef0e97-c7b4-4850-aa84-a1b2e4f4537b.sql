ALTER TABLE rallies ADD COLUMN pass_code INTEGER;
COMMENT ON COLUMN rallies.pass_code IS 'Qualidade do passe do setter (0=erro, 1=negativo, 2=positivo, 3=excelente)';