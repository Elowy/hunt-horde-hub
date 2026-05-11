## Cél

Az „Új állat" és „Állat módosítása" dialógusok **További adatok** szekciójának bővítése:

1. Új **Felhasználás és vásárló** alszekció (az Árazás és számlázás után).
2. A **Vadgazdálkodási egység** + **Vadász típusa** (és kapcsolódó vadász mezők) átrendezése egy önálló, vizuálisan elkülönített csoportba (ugyanolyan keretes/`bg-muted/20` stílussal, mint az „Árazás és számlázás").

## Új mezők

A „Felhasználás és vásárló" blokkban:

- **Felhasználás típusa** – Select: `Saját felhasználás`, `Ajándékozás`, `Barter`, `Eladás`.
- **Vásárló típusa** – Checkbox csoport: `Magánszemély`, `Vállalkozás` (egyet lehet kiválasztani; ha bekapcsolva van „Vállalkozás", megjelenik az adószám mező).
- **Vásárló neve** – szöveg input.
- **Vásárló lakcíme** – három input egy sorban: `Irányítószám`, `Település`, `Utca, házszám`.
- **Vásárló adószáma** – csak akkor jelenik meg, ha a vásárló típusa „Vállalkozás".

A teljes „Felhasználás és vásárló" blokk **csak akkor jelenjen meg**, ha a felhasználás típusa `Eladás`, `Ajándékozás` vagy `Barter`. (Saját felhasználásnál nem releváns – kérek megerősítést, lásd lent.)

## Vadász csoport átrendezése

Új kártya „Vadász és terület" címmel, benne a jelenlegi:
- Vadgazdálkodási egység (Pro)
- Vadász típusa
- Vadász neve / vadászjegy száma / egyedi vadász toggle (a meglévő logika változatlan)

## Adatbázis változás

Új oszlopok a `public.animals` táblába (mind nullable):

- `usage_type text`
- `buyer_type text` — `private` | `company`
- `buyer_name text`
- `buyer_zip text`
- `buyer_city text`
- `buyer_address text`
- `buyer_tax_number text`

Külön RLS módosítás nem kell (meglévő szabályok érvényesek a táblára).

## Érintett fájlok

- `src/components/AddAnimalDialog.tsx` — új state mezők, új UI blokk, vadász csoport keretbe rendezése, mentésnél új mezők átadása.
- `src/components/EditAnimalDialog.tsx` — ugyanezek az új mezők megjelenítése + frissítés mentéskor (kezdeti értékek a betöltött állatból).
- `src/components/ViewAnimalDialog.tsx` — új „Felhasználás és vásárló" rész a részletek nézetben.
- Adatbázis migráció (oszlopok hozzáadása).

## Nem változik

- Árazás és számlázás logikája és mezői.
- Vadász logikája (egyedi vadász, listából választás) – csak vizuális csoportosítás.
- Mentési/validációs alapfolyamat a többi mezőre.

## Kérdés megerősítésre

A „Felhasználás és vásárló" blokk **rejtve maradjon-e**, ha a felhasználás típusa „Saját felhasználás" (vagy nincs kiválasztva)? Alapértelmezetten így terveztem – ha mindig látszódjon, szólj.
