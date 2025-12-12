-- Add year_of_birth field to profiles table
ALTER TABLE public.profiles
ADD COLUMN year_of_birth INTEGER;

-- Add check constraint to ensure valid year (between 1900 and current year)
ALTER TABLE public.profiles
ADD CONSTRAINT year_of_birth_valid CHECK (
  year_of_birth IS NULL OR
  (year_of_birth >= 1900 AND year_of_birth <= EXTRACT(YEAR FROM CURRENT_DATE))
);

-- Add comment to the column
COMMENT ON COLUMN public.profiles.year_of_birth IS 'Year of birth for age calculation';
