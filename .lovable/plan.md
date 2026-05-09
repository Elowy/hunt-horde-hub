## Cél

Az „Új állat hozzáadása" dialógusban a Vadász típusa kiválasztása után **minden típusnál** (Tag, Bérvadász, IB Vendég, Vendég, Egyéb) ugyanaz a viselkedés: megjelenik az adott típushoz tartozó vadászok listája, és emellett mindig elérhető a „➕ Egyedi vadász megadása…" opció, ami szabad név + vadászjegyszám beírást nyit.

## Változtatás

`src/components/AddAnimalDialog.tsx`:

1. A „Vadász típusa" Select `onValueChange` handlere már **ne** állítsa automatikusan `isCustomHunter = true`-ra az „Egyéb" típust. Minden típusnál ugyanúgy a lista jelenjen meg alapértelmezetten.
2. A vadász neve blokk (Select listával + „➕ Egyedi név beírása…" opcióval) az „Egyéb" típusnál is jelenjen meg ugyanúgy, mint a többinél.
3. Ha a felhasználó kiválasztja az „➕ Egyedi név beírása…" opciót (vagy a már létező „Lista" gombbal vissza), akkor a meglévő `manualHunterName` ág fut le: szabad név + vadászjegyszám input. Ez a logika változatlan marad.
4. Az `isCustomHunter` állapot eltávolítható, vagy egyszerűen mindig `false`-ra állítva használjuk — a manuális mód tisztán a `manualHunterName`-en keresztül vezérelt minden típusnál.
5. A SelectItem felirata legyen egységes: „➕ Egyedi vadász megadása…" (a jelenlegi „Egyéb név beírása…" helyett), hogy a Tag / Vendég / Egyéb stb. típusoknál is értelmes legyen.

A lista szűrése `hunters.filter(h => h.hunter_category === formData.hunterType)` alapon működik tovább, így az „Egyéb" típushoz tartozó vadászok is megjelennek, ha vannak ilyen kategóriájúak.

## Nem változik

- A Vadász típusa lista opciói (Tag, Bérvadász, IB Vendég, Vendég, Egyéb) változatlanok.
- A vadászjegyszám mező továbbra is csak a manuális (egyedi vadász) módban jelenik meg.
- Semmi más mező, logika vagy mentési viselkedés nem módosul.
- Az `EditAnimalDialog` ebben a körben nem érintett (a felhasználó kifejezetten csak ezt az egy dolgot kérte).
