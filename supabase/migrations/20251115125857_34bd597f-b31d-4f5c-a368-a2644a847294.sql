-- Add average_tusk_length column for wild boars (only males)
ALTER TABLE public.animals 
ADD COLUMN average_tusk_length numeric;

-- Add judgement_number column for all animals
ALTER TABLE public.animals 
ADD COLUMN judgement_number text;

COMMENT ON COLUMN public.animals.average_tusk_length IS 'Average tusk length for male wild boars';
COMMENT ON COLUMN public.animals.judgement_number IS 'Judgement result notification number for all animals';