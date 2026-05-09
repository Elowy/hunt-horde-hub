## Cél

A „További adatok" szekcióban jelenjenek meg az állat árazásával kapcsolatos mezők — automatikusan kiszámolva az aktuális árlistából, de a felhasználó által felülírhatóan — valamint egy számla sorszáma mező.

## Új mezők a „További adatok" alatt

Egy új „Árazás és számlázás" alszekció a Collapsible tetején:

| Mező | Forrás / viselkedés |
|---|---|
| Nettó ár (Ft) | Auto: `súly × árlista Ft/kg` (járványügyi esetén `lőtt + minta + ár`). Szerkeszthető. |
| ÁFA mérték (%) | Auto: faj/osztály árlista vagy profil VAT. Szerkeszthető. |
| Bruttó ár (Ft) | Auto: `nettó × (1 + áfa/100)`. Szerkeszthető (visszaszámolja a nettót). |
| Hűtési díj (Ft/kg) | Auto: hűtőhely + faj/osztály legjobb találat (a meglévő `matchScore` logikával). Szerkeszthető. Nullázódik ha „Hűtési díj nélkül" be van pipálva. |
| Hűtési ÁFA (%) | Auto: a kiválasztott hűtési árlistából. Szerkeszthető. |
| Össz érték (Ft) | Számolt, csak olvasható: `bruttó ár + (hűtési díj × súly × (1 + hűtési áfa/100))`. |
| Számla sorszáma | Szabad szöveg (pl. „2026/0123"). |

## Számítási logika

- Egy `useEffect` figyeli `formData.weight`, `type`, `class`, `storageLocationId`, `priceSettings`, `epidemicMeasures`, `vatRate` változását, és újraszámolja a mezőket — **kivéve azokat, amiket a felhasználó már kézzel módosított** (egy `pricingTouched` rekord segítségével mezőnként).
- A hűtési ár lekérése: a meglévő `matchScore` algoritmus átkerül a `handleSubmit`-ből egy közös helper függvénybe, hogy itt is használható legyen async.
- A „Hűtési díj nélkül" checkbox bepipálása a hűtési mezőket nullára állítja és letiltja.

## Mentés (handleSubmit)

A jelenlegi `transport_price_per_kg`, `transport_vat_rate`, `transport_cooling_price`, `transport_cooling_vat_rate` mezőkbe a felhasználó által (esetleg módosított) végleges értékek kerülnek — `Ft/kg`-ra visszaszámolva, ha a felhasználó nettó/bruttó összegben írta felül (osztva a súllyal).

A számla sorszáma új DB oszlopba kerül.

## Adatbázis változás

Új oszlop az `animals` táblán:

- `invoice_number TEXT` (nullable)

## Érintett fájlok

1. **Adatbázis migráció** — `animals.invoice_number` oszlop hozzáadása.
2. **`src/components/AddAnimalDialog.tsx`**:
   - Új state mezők: `netPrice`, `grossPrice`, `priceVat`, `coolingPricePerKg`, `coolingVat`, `invoiceNumber`, plus `pricingTouched` set.
   - Új helper: `fetchBestCoolingPrice(storageLocationId, species, class)`.
   - Új `useEffect` az árak újraszámolására.
   - Új UI blokk a Collapsible tetején (4–5 input mező + olvasható „Össz érték").
   - `handleSubmit` frissítése: a state-ből veszi a végleges árakat; `invoice_number` mentése.

## Megjegyzés (nem technikai)

A felhasználó a vad felvételekor látni fogja az aktuális árlista alapján kiszámolt nettó/bruttó árat, ÁFA mértéket, hűtési díjat és összértéket. Bármelyik mezőt felülírhatja, és megadhat egy számla sorszámot is. Mentéskor a végleges (esetleg módosított) értékek és a számla sorszáma is rögzítésre kerülnek.
