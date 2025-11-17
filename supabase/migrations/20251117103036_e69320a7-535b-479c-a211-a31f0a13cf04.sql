-- Add reservation columns to animals table
ALTER TABLE public.animals
ADD COLUMN reservation_status TEXT DEFAULT 'available' CHECK (reservation_status IN ('available', 'pending', 'approved', 'atev')),
ADD COLUMN reserved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN reserved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN reservation_note TEXT;

-- Create index for better performance
CREATE INDEX idx_animals_reservation_status ON public.animals(reservation_status);
CREATE INDEX idx_animals_reserved_by ON public.animals(reserved_by);

-- Add comment to explain the columns
COMMENT ON COLUMN public.animals.reservation_status IS 'Foglalási státusz: available (zöld - elérhető), pending (sárga - foglalva, jóváhagyás szükséges), approved (piros - foglalva, jóváhagyva), atev (lila - kobzott, gázolt)';
COMMENT ON COLUMN public.animals.reserved_by IS 'A vadász aki igényt tartott a vadra';
COMMENT ON COLUMN public.animals.reserved_at IS 'Mikor került lefoglalásra';
COMMENT ON COLUMN public.animals.reservation_note IS 'Megjegyzés a foglaláshoz';