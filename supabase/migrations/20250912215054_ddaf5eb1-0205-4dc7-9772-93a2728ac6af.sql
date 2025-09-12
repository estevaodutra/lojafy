-- Fix address type constraint to match UI options
ALTER TABLE addresses DROP CONSTRAINT IF EXISTS addresses_type_check;

-- Add new constraint that allows home, work, other
ALTER TABLE addresses ADD CONSTRAINT addresses_type_check 
CHECK (type = ANY (ARRAY['home'::text, 'work'::text, 'other'::text]));