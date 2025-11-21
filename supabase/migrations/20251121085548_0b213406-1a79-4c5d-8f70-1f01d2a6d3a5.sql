-- Add vat_rate and cooling_price_per_kg to epidemic_measures table
ALTER TABLE epidemic_measures 
ADD COLUMN vat_rate numeric DEFAULT 27 NOT NULL,
ADD COLUMN cooling_price_per_kg numeric DEFAULT NULL;

COMMENT ON COLUMN epidemic_measures.vat_rate IS 'ÁFA százalék, amely minden járványügyi tételre vonatkozik (állat ára, mintavétel, kilövés, hűtés)';
COMMENT ON COLUMN epidemic_measures.cooling_price_per_kg IS 'Járványügyi hűtési díj Ft/kg-ban. Ha nincs megadva, a tárolóhely hűtési díja lesz használva';