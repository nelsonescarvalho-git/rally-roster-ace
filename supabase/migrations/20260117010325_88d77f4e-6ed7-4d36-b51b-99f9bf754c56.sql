-- Add column to store who serves first in the 5th set (determined by coin toss)
ALTER TABLE matches 
ADD COLUMN set5_serve_side text DEFAULT NULL;