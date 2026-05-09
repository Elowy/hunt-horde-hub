## Cél

Új "Vad típus" legördülő mező az állat hozzáadásánál, amely a kiválasztott vadfajtól függően mutat különböző opciókat.

## Viselkedés

A "Vadfaj" mező mellé kerül egy új "Vad típus" mező az alábbi feltételes opciókkal:

| Vadfaj | Választható típusok |
|---|---|
| 🐗 Vaddisznó | Kan, Koca, Süldő, Malac |
| 🦌 Gím Szarvas | Borjú, Ünő, Bika, Tehén |
| 🦌 Szika Szarvas | Borjú, Ünő, Bika, Tehén |
| 🦌 Dám Szarvas | Borjú, Ünő, Bika, Tehén |
| 🐏 Muflon | Bárány, Jerke, Juh, Kos |
| 🐏 Őz | Gida, Suta, Bak |
| Bármi más (Róka, Borz, Nyúl, Fácán, Fogoly...) | **Apróvad** (rögzített, nem módosítható) |

A mező alapértelmezetten **readonly/disabled** — csak akkor oldódik fel a szerkesztés, ha a felhasználó a fenti nagyvad fajok valamelyikét választja. Apróvad esetében automatikusan kitöltődik és zárolva marad.

Ha a felhasználó vadfajt vált, a "Vad típus" érték törlődik (kivéve apróvadnál).

## Érintett fájlok

1. **`src/lib/speciesConstants.ts`** — Új `GAME_TYPE_OPTIONS` konstans (vadfaj → opciók map) export, plusz egy `getGameTypesForSpecies(species)` segédfüggvény.
2. **`src/components/AddAnimalDialog.tsx`** — Új Select mező a Vadfaj és Nem között, kapcsolódó state (`game_type`), reset logika fajváltáskor, mentés a DB-be.
3. **`src/components/EditAnimalDialog.tsx`** — Ugyanez a mező a szerkesztő dialógusban (konzisztencia).
4. **Adatbázis migráció** — `animals` táblához új `game_type TEXT` oszlop (nullable a meglévő rekordok miatt).
5. **`src/integrations/supabase/types.ts`** — Automatikusan frissül a migráció után.

## Megjegyzés

A meglévő "Osztály" (I/II/III/IV) mező változatlan marad — a "Vad típus" ettől független új mező.
