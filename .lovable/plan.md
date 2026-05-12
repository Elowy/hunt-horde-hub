## Cél

A meglévő **biztonsági körzetek** (`SecurityZonesDialog`) rendszer kibővítése **térkép alapú polygon-rajzolással** (Leaflet + OpenStreetMap), a jelenlegi szöveges mezők megtartása mellett.

## 1. Csomagok

Telepítendő:
- `leaflet`
- `react-leaflet`
- `leaflet-draw` + `react-leaflet-draw`
- `@types/leaflet`, `@types/leaflet-draw` (dev)

A Leaflet CSS-t (`leaflet/dist/leaflet.css` és `leaflet-draw/dist/leaflet.draw.css`) globálisan importáljuk a `src/main.tsx`-ben (vagy a térkép komponensben), és a marker-ikon path-fix snippet bekerül egy közös helyre.

## 2. Adatbázis migráció

Új oszlop a `public.security_zones` táblába:

```sql
ALTER TABLE public.security_zones
  ADD COLUMN IF NOT EXISTS polygon_geojson jsonb;
```

- Nullable, default `NULL` (opcionális mező marad).
- RLS nem változik (a meglévő szabályok érvényesek).
- A `point_in_polygon` DB függvény már GeoJSON formátumot vár — kompatibilis.

## 3. Új komponens: `SecurityZoneMap`

Fájl: `src/components/SecurityZoneMap.tsx`

Props:
- `value?: GeoJSON.Polygon | null` — meglévő polygon
- `onChange: (polygon: GeoJSON.Polygon | null) => void`
- `readOnly?: boolean` — listanézet/popup esetére
- `height?: number` — alapból 400px

Funkciók:
- `MapContainer` OSM csempékkel, alap nézet: Magyarország közepe (`lat 47.1625, lng 19.5033, zoom 7`).
- `FeatureGroup` + `EditControl` (react-leaflet-draw) — csak `polygon` rajzolás engedélyezve, a többi (kör, marker, vonal) letiltva.
- Csak **egy polygon** lehet egyszerre — új rajzolás kezdetén a régi automatikusan törlődik.
- Magyar feliratok: a Leaflet.draw `L.drawLocal` objektum felülírásával (`Rajzolás indítása`, `Mentés`, `Törlés`, `Mégse`, csúcspont szövegek stb.).
- Ha van `value`, betöltéskor `fitBounds` ráközelít.
- Mobil támogatás: a `touchExtend` és `tap` opciók be vannak kapcsolva (Leaflet alapból támogatja).
- `readOnly` módban nincs `EditControl`, csak megjelenítés.

## 4. `SecurityZonesDialog` bővítése

Fájl: `src/components/SecurityZonesDialog.tsx`

A meglévő űrlap (név + leírás) kiegészül:
- Új **Tabs** komponens: „Adatok" / „Térképen berajzolás".
- A „Térképen berajzolás" tabon a `SecurityZoneMap` szerkesztő módban.
- Mentéskor a polygon GeoJSON a `polygon_geojson` oszlopba kerül.
- Szerkesztéskor a meglévő polygon betöltődik.

A lista nézet (meglévő körzet kártyák):
- Új gomb a dialógus tetején: **„Térkép nézet"** toggle.
- Bekapcsolva egy nagy (~500px) `MapContainer` jelenik meg, amin minden körzet polygonja megjelenik különböző színnel (egyszerű hash-alapú szín a `zone.id`-ból, HSL design tokenekhez illesztve).
- Polygonra kattintva `Popup` a körzet nevével és leírásával.

## 5. TypeScript típusok

A migráció után a `src/integrations/supabase/types.ts` automatikusan frissül (új `polygon_geojson: Json | null` mező a `security_zones` táblán). Külön kézi módosítás nem kell.

## 6. Érintett fájlok

- **Új:** `supabase/migrations/<timestamp>_add_security_zone_polygon.sql`
- **Új:** `src/components/SecurityZoneMap.tsx`
- **Módosítás:** `src/components/SecurityZonesDialog.tsx` — Tabs, térkép integráció, „Térkép nézet" toggle
- **Módosítás:** `src/main.tsx` — Leaflet CSS-ek importálása
- **`package.json`** — új dependency-k

## 7. Mit NEM változtatunk

- A meglévő szöveges mezők (`name`, `description`) maradnak.
- Más komponensek, amelyek a `security_zones`-t használják (statisztikák, beiratkozások stb.), nem változnak.
- A polygon opcionális marad — körzet polygon nélkül is létrehozható.
- Nem cserélünk térkép szolgáltatót (csak Leaflet + OSM).

## 8. Kockázatok / megjegyzések

- A Leaflet alap marker-ikonjai Vite alatt path-problémákat okoznak — bekerül a standard `delete (L.Icon.Default.prototype as any)._getIconUrl` fix.
- `react-leaflet-draw` jelenleg react-leaflet v4-hez van igazítva — telepítéskor figyelni kell a verzióegyezésre; ha gond van, a sima `leaflet-draw`-t használjuk közvetlenül egy custom React wrapperrel.
- SSR nem érint (Vite SPA).
