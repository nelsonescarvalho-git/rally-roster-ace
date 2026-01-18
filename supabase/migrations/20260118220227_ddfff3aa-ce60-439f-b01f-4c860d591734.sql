-- Add column for attack pass quality (quality of distribution received before attack)
ALTER TABLE public.rallies 
ADD COLUMN a_pass_quality integer;