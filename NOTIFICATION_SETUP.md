# Email Értesítési Rendszer Beállítása

## Resend API Kulcs Beállítása

Az email értesítések küldéséhez a Resend szolgáltatást használjuk. Kövesse az alábbi lépéseket:

1. **Regisztráció vagy Bejelentkezés**
   - Látogasson el a https://resend.com oldalra
   - Hozzon létre egy fiókot vagy jelentkezzen be

2. **Email Domain Hitelesítése**
   - Menjen a https://resend.com/domains oldalra
   - Adja hozzá és hitelesítse az email domain-t
   - **FONTOS**: Az emailek küldéséhez a domain hitelesítése kötelező!

3. **API Kulcs Létrehozása**
   - Látogasson el a https://resend.com/api-keys oldalra
   - Hozzon létre egy új API kulcsot
   - Másolja ki és mentse el biztonságos helyre

4. **API Kulcs Beállítása a Projektben**
   - A Lovable projektben nyissa meg a Settings menüt
   - Secrets (Titkok) fül alatt adja hozzá a `RESEND_API_KEY` kulcsot
   - Illessze be az előbb létrehozott API kulcsot

## Értesítési Beállítások

A felhasználók a **Beállítások** menüpontban tudják személyre szabni az értesítéseiket:

### Elérhető Értesítési Típusok:

1. **Elszállítás történt** (alapértelmezetten BE)
   - Email érkezik új szállítólevél létrehozásakor
   - Tartalmazza: szállító adatait, dokumentumszámot, állatok számát, súlyt, árat

2. **Hűtő telítettség 80% felett** (alapértelmezetten BE)
   - Figyelmeztetés amikor egy hűtési hely kapacitása eléri a 80%-ot
   - Tartalmazza: helyszín neve, telítettség százalék, kapacitás, jelenlegi állatok száma

3. **Új vad hozzáadása** (alapértelmezetten BE)
   - Értesítés minden új állat regisztrációjáról
   - Tartalmazza: állat ID, faj, súly, osztály, hűtési helyszín

4. **Vad módosítása** (alapértelmezetten KI)
   - Értesítés állat adatok módosításakor
   - Tartalmazza: módosított mezők részletes listája (régi → új értékek)

5. **Vad törlése** (alapértelmezetten KI)
   - Értesítés állat törlésekor
   - Tartalmazza: törölt állat összes adata

### Minden Email Tartalmazza:
- Az esemény részletes adatait
- Az esemény időpontját (magyar időzóna)
- A műveletet végző felhasználó IP címét
- Link a beállítások módosításához

## Értesítések Implementálása a Kódban

### Hook Használata

```typescript
import { useNotifications } from "@/hooks/useNotifications";

const MyComponent = () => {
  const { sendNotification } = useNotifications();

  const handleEvent = async () => {
    // ... műveletek végrehajtása ...
    
    // Értesítés küldése
    await sendNotification({
      notification_type: 'animal_add', // vagy más típus
      data: {
        animal_id: "VD-2024-001",
        species: "Őz",
        weight: 25,
        class: "I",
        location_name: "Hűtő #1"
      }
    });
  };
};
```

### Példa Elszállítás Értesítésre

```typescript
await sendNotification({
  notification_type: 'transport',
  data: {
    transporter_name: "Magyar Vadkert Kft.",
    document_number: "SZL-2024-001",
    transport_date: "2024-01-15",
    animal_count: 5,
    total_weight: 125,
    total_price: 187500
  }
});
```

### Példa Hűtő Telítettség Figyelmeztetésre

```typescript
// Ellenőrizni kell a Dashboard.tsx-ben a getLocationStats függvényben
const checkStorageCapacity = async (locationId: string) => {
  const stats = getLocationStats(locationId);
  const usagePercentage = (stats.currentCount / location.capacity) * 100;
  
  if (usagePercentage >= 80) {
    await sendNotification({
      notification_type: 'storage_full',
      data: {
        location_name: location.name,
        usage_percentage: Math.round(usagePercentage),
        capacity: location.capacity,
        current_count: stats.currentCount
      }
    });
  }
};
```

### Példa Vad Módosítás Értesítésre

```typescript
// Változások követése
const changes = {
  weight: { old: 20, new: 25 },
  class: { old: "II", new: "I" }
};

await sendNotification({
  notification_type: 'animal_update',
  data: {
    animal_id: "VD-2024-001",
    species: "Őz",
    changes: changes
  }
});
```

## Hibaelhárítás

### Email nem érkezik meg
1. Ellenőrizze, hogy a Resend domain hitelesítve van-e
2. Ellenőrizze a `RESEND_API_KEY` beállítását
3. Nézze meg a `notification_logs` táblát az adatbázisban
4. Ellenőrizze a Supabase Edge Function logokat

### IP cím nem jelenik meg
- Az IP címet a `https://api.ipify.org` szolgáltatásról kérdezzük le
- Ha ez nem elérhető, "Ismeretlen" érték kerül mentésre

### Értesítések nem mennek ki
- Ellenőrizze, hogy a felhasználó beállításaiban engedélyezve van-e az adott típusú értesítés
- A `notification_settings` táblában nézzük meg a felhasználó beállításait

## Edge Function Deploy

Az értesítési rendszer automatikusan deployolja a `send-notification` edge functiont.
Ha manuálisan szeretné deploy-olni:

```bash
supabase functions deploy send-notification
```

## Adatbázis Táblák

- **notification_settings**: Felhasználói értesítési beállítások
- **notification_logs**: Kiküldött értesítések naplója (email adatokkal, IP címmel)
