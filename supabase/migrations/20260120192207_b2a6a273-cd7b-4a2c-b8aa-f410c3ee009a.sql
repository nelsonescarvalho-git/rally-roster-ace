-- Add team color columns
ALTER TABLE teams ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT NULL;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN teams.primary_color IS 'Primary team color in HEX format (#RRGGBB)';
COMMENT ON COLUMN teams.secondary_color IS 'Secondary team color in HEX format (#RRGGBB)';