## Áttekintés

A codebase átvizsgálása és a Supabase linter futtatása alapján három kategóriában találtam javítandó problémákat. Tesztkeretrendszer (Vitest) jelenleg nincs beállítva — a Lovable harness automatikusan futtatja a buildet/typecheck-et, így külön kézi típusellenőrzést nem futtatok.

---

## 1. CSS `@import` sorrend hiba (Vite warning)

**Probléma**: A `src/index.css` első három sorában `@tailwind` direktívák vannak, és csak utána jön a Google Fonts `@import`. A CSS spec szerint `@import` minden más szabály ELŐTT kell álljon (kivéve `@charset` / üres `@layer`). A Vite figyelmeztet rá, és bizonyos böngészőkben a font nem töltődik be.

**Javítás**: A `@import url('https://fonts.googleapis.com/...')` sort a fájl legtetejére mozgatom, a `@tailwind` direktívák elé.

---

## 2. Stale Auth Token — `Invalid Refresh Token` hiba

**Probléma**: A console-ban folyamatosan megjelenik a `refresh_token_not_found` hiba az alkalmazás indulásakor. Ez akkor történik, ha a böngészőben tárolt Supabase session már lejárt vagy érvénytelen szerver-oldalon (pl. újraindítás, manuális logout, vagy a refresh token rotálva lett). Jelenleg az app csak logolja a hibát, de nem takarítja ki a stale tokent — emiatt minden oldalbetöltéskor megjelenik.

**Javítás**: A `src/integrations/supabase/client.ts` automatikusan generált, NEM módosítható. Helyette globális hibakezelőt adok hozzá az alkalmazás belépési pontjához (vagy egy közös auth hookhoz, pl. `App.tsx`-ben), ami:
- Feliratkozik a `supabase.auth.onAuthStateChange` eseményre
- `TOKEN_REFRESHED` hiba vagy `SIGNED_OUT` esetén kitakarítja a localStorage-ből a `sb-*` kulcsokat
- Egy egyszeri `try/catch` blokkba ágyazva ellenőrzi az indulási sessiont és csendben kihív egy `signOut({ scope: 'local' })`-ot, ha érvénytelen

Eredmény: a hibás token egyszer takarításra kerül, a console error eltűnik, a felhasználó tisztán a login képernyőre kerül.

---

## 3. Supabase biztonsági linter figyelmeztetések

A linter **80 figyelmeztetést** jelez, főként három csoportban:

### a) Túl megengedő RLS policy-k (3 db)
`USING (true)` vagy `WITH CHECK (true)` használata UPDATE/DELETE/INSERT művelethez. Migrációval szigorítjuk őket — minden ilyen policy kap megfelelő `auth.uid()` vagy `has_role(...)` ellenőrzést.

### b) Nyilvánosan hívható SECURITY DEFINER függvények (~38 db, anon szerep)
Sok belső segédfüggvény (pl. `has_role`, `is_admin_of_society`, balance triggerek, stb.) a `public` sémában van és az `anon` szerep is hívhatja őket. Migrációval:
```sql
REVOKE EXECUTE ON FUNCTION public.<fn>(...) FROM anon;
```
Csak a valóban publikus függvényeknél (pl. registration approval helper) hagyjuk meg az anon hozzáférést.

### c) Bejelentkezett userek által hívható SECURITY DEFINER függvények (~7 db)
Néhány adminisztratív függvény (pl. `delete_user`, `approve_registration`) jelenleg minden bejelentkezett user által hívható. Ezeket szűkítjük:
```sql
REVOKE EXECUTE ON FUNCTION public.<fn>(...) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.<fn>(...) TO service_role;
```
A jogosultság-ellenőrzést a függvény belsejébe is beletesszük (`IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION ...`).

**Megjegyzés**: A pontos függvénylistát a `security--get_table_schema` és a teljes linter output alapján fogom összeállítani a javítás során, és csak azokat módosítom, ahol a változás nem tör meg meglévő funkciót (pl. registration flow, hunter approval, balance triggerek).

---

## Tesztelés

Mivel jelenleg nincs Vitest beállítva, és a felhasználói flow viszonylag összetett (auth, multi-tenant), a tesztelést a következőképpen végzem:
1. A módosítások után újrafuttatom a `supabase--linter`-t, hogy lássuk a figyelmeztetések számának csökkenését.
2. Browser tool-lal megnyitom a preview-t, és ellenőrzöm hogy az auth-token hiba eltűnt a console-ból, és a regisztráció / bejelentkezés továbbra is működik.
3. Ha bármely DB függvény hozzáférésének szűkítése után regressziót látok, azt rögtön visszavonom.

---

## Érintett fájlok

- `src/index.css` — @import sorrend
- `src/App.tsx` — stale auth token kezelése
- Új migráció: `supabase/migrations/<ts>_security_lint_fixes.sql` — RLS és function GRANT szigorítások

## Amit NEM csinálok ebben a körben

- Nem írok új Vitest tesztkeretrendszert (ehhez külön kérés / döntés kellene a felhasználótól, mert nagyobb infra-változás).
- Nem nyúlok a `supabase/integrations/.../client.ts`-hez (auto-generated).
- Nem módosítok funkcionalitást, csak biztonsági szűkítést és bug-fixet.
