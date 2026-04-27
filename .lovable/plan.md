## Cél

Frissíteni az `AddAnimalDialog` "Vadász típusa" választót és a "Vadász neve" mezőt az alábbi logikával:

### Vadász típusai (új lista, ebben a sorrendben)
1. Tag (`tag`)
2. Bérvadász (`bervadasz`)
3. IB Vendég (`ib_vendeg`)
4. Vendég (`vendeg`)
5. Egyéb (`egyeb`)

A korábbi `Bérlövész` opció eltűnik, helyére `Bérvadász` és `IB Vendég` kerül. A kódérték-leképezés (`getHunterCategoryDisplay`) már ismeri ezeket az értékeket, így a meglévő vadászok kategóriái továbbra is helyesen jelennek meg.

### Vadász neve mező viselkedése

- Ha a kiválasztott típus **Egyéb** → szabad szöveges `Input` mező, ahol a vadász nevét manuálisan be lehet írni (jelenleg is így működik).
- Minden más típusnál (Tag, Bérvadász, IB Vendég, Vendég) → a meglévő vadászok listájából lehet választani **DE** legyen lehetőség manuális névbeírásra is. Ezt egy kombinált mezővel oldjuk meg:
  - Egy `Select` listázza a vadászokat a kiválasztott típushoz illeszkedve (kategória szűrés).
  - A lista végén egy külön opció: **"➕ Egyéb név beírása…"**.
  - Ha ezt választja a felhasználó, megjelenik egy `Input` mező a név szabadkézi beírásához (a típus marad a választott).
  - Egy kis "Lista" gomb visszakapcsolja a `Select` nézetre, ha mégis a listából akar választani.

### Vadászok listájának szűrése

A `hunters` lista a kiválasztott `hunterType` szerint szűrve jelenik meg (pl. ha "Tag" van kiválasztva, csak a `hunter_category = 'tag'` vadászok). Ha egy típusra nincs vadász, csak az "➕ Egyéb név beírása…" opció jelenik meg.

A típusváltáskor reset történik: `hunterName` üresre, manuális mód kikapcsolva.

## Érintett fájl

- `src/components/AddAnimalDialog.tsx`
  - A `Select` opciók cseréje (sor 695–700) az új sorrendre/listára.
  - Új state: `manualHunterName: boolean` a "lista vagy szabad szöveg" váltáshoz.
  - A "Vadász neve" blokk (sor 704–739) átalakítása: szűrt vadászlista + "Egyéb név beírása…" opció + `Input` váltás.
  - Az `egyéb` típus változatlanul marad: közvetlenül `Input` jelenik meg.
  - Adatbázis-mentés és `getHunterCategoryDisplay` változatlan; csak az UI logika frissül.

Nincs adatbázis-migráció szükséges.