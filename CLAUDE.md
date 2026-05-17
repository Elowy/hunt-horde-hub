# Hunt Horde / Vadgondnok — projekt kontextus

## Mi ez
Magyar vadásztársaság-kezelő SaaS. React + Vite + TypeScript + Tailwind + shadcn/ui.
Backend: SELF-HOSTED Supabase egy Hetzner szerveren (NEM Supabase Cloud).

## Kritikus: deploy workflow
- A fejlesztés itt, lokálisan történik. Git push után a SZERVEREN kell deployolni.
- A Claude Code NEM fér hozzá a szerverhez — csak a kódot írja, a deployt a felhasználó futtatja a szerveren.

### Kötelező sorrend ha új migráció is van:
1. `cd ~/hunt-horde-hub && git pull`  — először a kód legyen fenn a szerveren
2. `~/db-update.sh`                   — EZUTÁN futtatja a migrációt (ha előbb fut, a fájl még nincs ott)
3. `~/deploy.sh`                      — build + Caddy reload (maga is git pull-oz, de NEM futtat migrációt)

### Ha csak frontend/edge function változott (nincs új migráció):
- `~/deploy.sh` elegendő (git pull + build + Caddy reload)
- Edge function változás után még: `docker compose restart functions`

### Eszközök:
- `~/deploy.sh`   — git pull + build + Caddy reload
- `~/db-update.sh` — supabase/migrations/*.sql fájlok futtatása sorban

## Self-hosted Supabase specifikumok (FONTOS)
- Edge function-ökben SOHA ne importálj `@supabase/supabase-js@2/cors`-t — az NEM létezik. corsHeaders-t inline kell definiálni.
- Edge function-ökben a SUPABASE_URL belül `http://kong:8000`. A böngészőnek visszaadott
  signed URL-eknél a hostot cserélni kell `https://api.hunthorde.com`-ra.
- Publikus (bejelentkezés nélküli) műveletekhez — pl. QR-állatbeküldés — edge function kell
  service_role kulccsal, NEM közvetlen tábla-INSERT (RLS/session problémák miatt).
- Minden DB-séma változás egy új fájl a supabase/migrations/ alá (timestamp prefix-szel),
  amit a szerveren a ~/db-update.sh futtat. Ne felejtsd el a migrációt!

## Domain
- Frontend: https://hunthorde.com
- API: https://api.hunthorde.com
- Repo: github.com/Elowy/hunt-horde-hub

## Stílus
- Minden user-facing szöveg magyar.
- Minimális formázás, shadcn/ui komponensek.
