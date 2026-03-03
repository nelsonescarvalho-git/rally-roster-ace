
-- Add attack_direction to rally_actions
ALTER TABLE public.rally_actions ADD COLUMN attack_direction TEXT;

-- Add attack_direction to rallies (legacy sync)
ALTER TABLE public.rallies ADD COLUMN attack_direction TEXT;
