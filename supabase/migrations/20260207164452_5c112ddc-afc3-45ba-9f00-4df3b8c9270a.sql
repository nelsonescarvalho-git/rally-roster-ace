-- Add serve_type column to rally_actions table
ALTER TABLE rally_actions ADD COLUMN serve_type TEXT;

-- Add s_type column to rallies table for legacy support
ALTER TABLE rallies ADD COLUMN s_type TEXT;