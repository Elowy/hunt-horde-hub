# Számlázz.hu integráció terv

Manuális számlakiállítás Számla Agent API-n keresztül. Minden vadásztársaság saját Agent kulccsal állít ki számlát. A kiállított számlák külön táblában követhetők, a PDF-ek Storage-ban tárolódnak.

**Fontos:** csak forráskódot írunk — a deploy manuálisan történik a self-hosted Supabase szerveren (Hetzner). Nem futtatunk Supabase CLI-t és nem deployolunk semmit.

## 1. Adatbázis migration

Egy új fájl: `supabase/migrations/<timestamp>_szamlazz_integration.sql`

**`profiles` bővítés:**
- `szamlazz_agent_key` (TEXT) — egyedi Agent kulcs
- `szamlazz_invoice_prefix` (TEXT, default `'VG'`)
- `szamlazz_enabled` (BOOLEAN, default false)
- COMMENT a kulcs mezőre az RLS védelemről

A meglévő `profiles` RLS biztosítja, hogy a user csak saját rekordját lássa — külön szabály nem kell. Service role minden esetben hozzáfér.

**`invoices` tábla** a felhasználó által megadott séma szerint:
- `hunter_society_id`, `created_by`, `source_type`, `source_id`
- `szamlazz_invoice_number`, `szamlazz_url`, vevő adatai (`buyer_*`)
- `net_amount`, `vat_amount`, `gross_amount`, `currency` (default `HUF`)
- `status` (`pending|issued|failed`), `error_message`
- indexek: `hunter_society_id`, `(source_type, source_id)`, `created_at DESC`
- RLS: SELECT — saját társaság vagy super_admin; INSERT — saját társaság vagy admin; UPDATE — csak service role (edge function)
- `updated_at` trigger a meglévő `update_updated_at_column()` függvénnyel

**Storage bucket:**
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false)
ON CONFLICT DO NOTHING;
```
RLS policy a `storage.objects`-en: a társaság csak a saját `{hunter_society_id}/...` mappáját olvashatja, írni a service role.

## 2. Edge function források

### `supabase/functions/szamlazz-create-invoice/index.ts`

1. CORS preflight (`npm:@supabase/supabase-js@2/cors`)
2. JWT validálás `getClaims()` mintával
3. Bemenet validálás Zod-dal: `source_type`, opcionális `source_id`, `buyer` (név, opcionális email/adószám, irsz, város, cím), `items[]` (név, mennyiség, egység, nettó egységár, ÁFA-kulcs string), opcionális `comment`
4. Service role klienssel `profiles` lekérés a user ID alapján → `szamlazz_agent_key`, `szamlazz_enabled`, `szamlazz_invoice_prefix`. Ha `enabled=false` vagy nincs kulcs → 400 magyar hibaüzenettel
5. `pending` rekord beszúrása az `invoices` táblába (request kontextus + összegek számítása nettó/ÁFA/bruttó kerekítéssel)
6. `xmlszamla` v3 XML összeállítás:
   - `<beallitasok>`: `szamlaagentkulcs`, `eszamla=true`, `szamlaLetoltes=true`, `szamlaLetoltesPld=1`, `valaszVerzio=2`
   - `<fejlec>`: `keltDatum`, `teljesitesDatum`, `fizetesiHataridoDatum` (+8 nap), `fizmod=Átutalás`, `penznem=HUF`, `szamlaNyelve=hu`, `elotag` a profilból, `megjegyzes` a `comment`-ből
   - `<elado>`: üres (Agent kulcs adja)
   - `<vevo>`: buyer mezőkből (`nev`, `irsz`, `telepules`, `cim`, opcionális `email`, `adoszam`, `sendEmail=true` ha email van)
   - `<tetelek>`: items → `<tetel>` (`megnevezes`, `mennyiseg`, `mennyisegiEgyseg`, `nettoEgysegar`, `afakulcs`, `nettoErtek`, `afaErtek`, `bruttoErtek`)
   - XML-es speciális karakterek escapelése
7. HTTP POST `https://www.szamlazz.hu/szamla/`, `multipart/form-data`, `action-xmlagentxmlfile` mező az XML-lel
8. Válasz feldolgozás:
   - Header `szlahu_error_code` / `szlahu_error` → ha hiba: `failed` státusz, `error_message` mentése, válasz 502
   - Header `szlahu_szamlaszam`, `szlahu_nettovegosszeg`, `szlahu_bruttovegosszeg`
   - Body PDF binary → feltöltés `invoices` bucket-be `{hunter_society_id}/{szamlaszam}.pdf` útvonalra (service role)
9. `invoices` rekord update: `status=issued`, számlaszám, storage path, összegek
10. JSON válasz: `{ success: true, invoice: { id, szamlazz_invoice_number, szamlazz_url, net_amount, vat_amount, gross_amount } }`

Minden hiba → `failed` státusz mentése + magyar hibaüzenet, CORS header minden válaszban.

### `supabase/functions/szamlazz-get-pdf/index.ts`

- CORS + JWT validálás
- Bemenet: `invoice_id`
- Ellenőrzi, hogy a user-é (vagy super_admin) az `invoices` rekord (RLS-en keresztül anon kliens user JWT-vel)
- Service role klienssel signed URL generálás 1 óra TTL-lel a tárolt path-ra
- Visszaad: `{ url: string, expires_at: string }`

### Config

Nem írunk át semmit a `supabase/config.toml`-ban — az alapértelmezett `verify_jwt=false` viselkedéssel élünk, JWT-t a kódban validálunk.

## 3. Frontend változások

### `SzamlazzSettingsCard.tsx` (új)
- Helye: `HunterSocietySettings.tsx`-ben új kártya, csak `hunter_society` user_type-nak
- Mezők: `szamlazz_enabled` (Switch), `szamlazz_agent_key` (password input — soha nem visszaolvasva, „nincs változtatás" placeholder ha be van állítva), `szamlazz_invoice_prefix`
- Mentés direkt update-tel a `profiles`-on (üres kulcs mezőt nem küld vissza)
- Súgó link a Számla Agent kulcs beszerzéséhez

### `CreateInvoiceDialog.tsx` (új, újrahasználható)
- Props: `open`, `onOpenChange`, `sourceType`, `sourceId?`, `prefilledBuyer?`, `prefilledItems?`
- Vevő blokk: név, email, adószám, irsz, város, cím
- Tétel táblázat: dinamikus sorok (név, mennyiség, egység, nettó egységár, ÁFA-kulcs select: `27`, `5`, `18`, `0`, `AAM`, `TAM`)
- Élő összesítő: nettó / ÁFA / bruttó
- Megjegyzés mező
- „Kiállítás" gomb → `supabase.functions.invoke('szamlazz-create-invoice', ...)`
- Sikerkor: toast „Számla kiállítva: VG-2026-001" + PDF letöltés link

### `Invoices.tsx` (új oldal, `/invoices` route)
- Lista az `invoices` táblából (saját társaság számlái)
- Szűrők: státusz, dátum, `source_type`
- Sor műveletek: PDF letöltés (`szamlazz-get-pdf`), részletek dialog, újrapróbálás `failed`-nél
- „Új számla" gomb → `CreateInvoiceDialog` `source_type='manual'`-lel

### Integrációk meglévő oldalakon
- **Animals lista** (storage / pending): „Számla" akció minden soron, prefill állat névből/súlyból, vevő a kapcsolódó buyer profilból ha van
- **Transport documents lista**: „Számla" gomb a dokumentumon, prefill transport tételekből és buyer-ből
- **Membership payments lista**: „Számla" gomb minden befizetésnél, prefill „Tagdíj YYYY-időszak" tétellel

### Menü
- `DashboardMenu`-ben új menüpont „Számlák" admin/editor szerepkörnek, csak ha `szamlazz_enabled=true` (a profilból olvasva)
- Új route az `App.tsx`-ben

## 4. Magyar lokalizáció

Minden felirat, toast, hibaüzenet, dialog cím magyarul. XML értékek (pl. `fizmod=Átutalás`) szintén magyarul a Számlázz.hu konvenció szerint.

## 5. Mit NEM csinálunk most

- Nincs automatikus számlakiállítás (trigger-ekből) — csak manuális, a `source_type/source_id` mezőket előkészítjük későbbi automatizáláshoz
- Nincs sztornó / módosító / díjbekérő számla
- Nincs Vault-alapú kulcstárolás (RLS védi a plain text kulcsot)
- Nem érintjük a Hunter Dashboard-ot (nem hunter feature)
- Nem futtatunk deploy parancsot — a két edge function és migration csak forrásként készül el

## Érintett fájlok

- **Új:** `supabase/migrations/<timestamp>_szamlazz_integration.sql`
- **Új:** `supabase/functions/szamlazz-create-invoice/index.ts`
- **Új:** `supabase/functions/szamlazz-get-pdf/index.ts`
- **Új:** `src/components/SzamlazzSettingsCard.tsx`
- **Új:** `src/components/CreateInvoiceDialog.tsx`
- **Új:** `src/pages/Invoices.tsx`
- **Módosítás:** `src/pages/HunterSocietySettings.tsx` (új kártya)
- **Módosítás:** `src/App.tsx` (új route)
- **Módosítás:** `src/components/DashboardMenu.tsx` (új menüpont)
- **Módosítás:** animals / transport documents / membership payments listák (Számla akció)

## Megjegyzések / kockázatok

- **Storage write az edge function-ből**: csak service role kliens írhat a privát `invoices` bucket-be — figyelni kell rá
- **Pénzügyi pontosság**: minden összeg `NUMERIC(12,2)`, a frontenden számolt összegeket a backend újraszámolja az XML-hez
- **Hibakezelés**: a Számlázz.hu Agent header-ekben adja vissza a hibakódokat; ezek mind az `error_message`-be kerülnek
- **PDF méret**: nagy számláknál érdemes streaming upload-ot használni, de első körben sima `Uint8Array` is elég
- **Self-hosted deploy**: a felhasználó manuálisan deployolja a function-öket és futtatja a migrationt a szerveren
