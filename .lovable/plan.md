## Cél

A „Korcsop" (korcsoport) mező az „Új állat hozzáadása" dialógusban csak akkor jelenjen meg, ha a faj `🐗 Vaddisznó`. Más fajoknál ne jelenjen meg.

## Változtatás

`src/components/AddAnimalDialog.tsx` (1094–1109. sor):

A „Korcsop" `<div>` blokkot körülvesszük egy feltétellel:

```tsx
{formData.type === "🐗 Vaddisznó" && (
  <div className="space-y-2">
    <Label htmlFor="age">Korcsop</Label>
    <Select ...>
      ...
    </Select>
  </div>
)}
```

## Nem változik

- Semmi más mező, sorrend, logika vagy mentési viselkedés.
- Az `EditAnimalDialog` nem érintett (a felhasználó kifejezetten csak az „Új állat" felületen kérte).
