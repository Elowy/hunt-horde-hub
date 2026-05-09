## Cél

Az „Állat módosítása" (EditAnimalDialog) dialógus tartalmazza az „Új állat hozzáadása" (AddAnimalDialog) összes szerkeszthető mezőjét, ugyanazokkal a viselkedési szabályokkal.

## Hiányzó mezők az EditAnimalDialog-ban

| Mező | Forrás (AddAnimalDialog) |
|---|---|
| Vad típus (`game_type`) | Vadfajtól függő legördülő, apróvad esetén readonly |
| Vadászjegyszám (`hunter_license_number`) | Egyéni vadász esetén szöveges input |
| Bírálati eredményközlő szám (`judgement_number`) | Szöveges input |
| Átlag agyarhossz (`average_tusk_length`) | Csak vaddisznó + hím esetén |
| Számla sorszáma (`invoice_number`) | Szöveges input az árazás szekcióban |
| Nettó / Bruttó / ÁFA (árazás) | Auto-számolt, felülírható |
| Hűtési díj (Ft/kg) + Hűtési ÁFA | Auto-számolt árlistából, felülírható |
| Össz érték | Csak olvasható, számolt |
| „Hűtési díj nélkül – azonnal elszállítva" checkbox | Új állatnál van — szerkesztésnél csak akkor mutassuk, ha még nincs elszállítva |
| Elejtés időpontja datetime picker | Jelenleg csak date input — cseréljük le ugyanarra a Calendar + idő picker párosra mint Add-nál |

A meglévő mezők (animal_id, species, gender, class, weight, storage, security zone, hunter_name, hunter_type, age, sample_id, vet_*, notes) maradnak.

## Viselkedés

- **Vad típus**: ugyanaz a logika mint Add-ban (`getGameTypesForSpecies`, `isBigGameSpecies`, `SMALL_GAME_TYPE`). Vadfaj-váltáskor reset.
- **Árazás auto-kalkuláció**: ugyanaz a `useEffect` + `pricingTouched` minta mint Add-ban. Inicializáláskor a meglévő `transport_price_per_kg`, `transport_vat_rate`, `transport_cooling_price`, `transport_cooling_vat_rate`, `invoice_number` értékek töltik fel az állapotot, és **ezek `pricingTouched=true`-ként számítanak** (nehogy felülírja az árlista a már mentett, esetleg módosított értékeket). Ha a felhasználó kitörli/üríti, akkor az árlista visszatöltheti.
- **Számla sorszáma**: szabad szöveg, mentésnél `invoice_number` mezőbe.
- **Mentés**: a `transport_*` mezők a pricing state-ből számolódnak (Ft/kg-ra visszaosztva a súllyal), `game_type`, `hunter_license_number`, `judgement_number`, `average_tusk_length`, `invoice_number` mezők is mentésre kerülnek.

## Érintett fájl

`src/components/EditAnimalDialog.tsx`:

1. `formData` kibővítése: `game_type`, `hunter_license_number`, `judgement_number`, `average_tusk_length`.
2. Új `pricing` és `pricingTouched` állapot, `fetchBestCoolingPrice` helper, auto-kalkuláló `useEffect`, `handlePricingChange` (azonos az AddAnimalDialog mintájával).
3. `species` Select-hez új „Vad típus" Select.
4. UI: pricing szekció (6 mező + össz érték), számla sorszáma, vadászjegyszám, bírálati szám, agyarhossz feltételes mező, datetime picker (`Calendar` + `Popover` + idő input).
5. `handleSubmit` update payload: új mezők hozzáadása + `transport_*` és `invoice_number` mentése a pricing state-ből.
6. `useEffect` init blokk: pricing state feltöltése a meglévő animal értékeiből, `pricingTouched` mezőnként `true`-ra ahol van mentett érték.

## Megjegyzés (nem technikai)

A módosító ablak ezután ugyanazt a kitöltöttséget és funkcionalitást nyújtja, mint az új állat felvétele — minden adat szerkeszthető marad, beleértve az árazási és számlázási mezőket, a vad típusát és minden járulékos információt.
