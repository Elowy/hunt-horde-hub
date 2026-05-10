## Cél

Az „Új állat hozzáadása" dialógusban két mező feltételes megjelenítése:

1. **Mintaközlő szám** – csak `🐗 Vaddisznó` faj választása esetén látszódjon.
2. **Bírálati eredményközlő szám** – csak akkor jelenjen meg, ha a faj `🐗 Vaddisznó`, `🐏 Muflon`, `🦌 Gím Szarvas`, `🦌 Dám Szarvas`, `🦌 Szika Szarvas` vagy `🐏 Őz`, **és** a nem `Hím`.

## Változtatás

`src/components/AddAnimalDialog.tsx` (1113–1131. sor)

- Mintaközlő szám blokk köré: `{formData.type === "🐗 Vaddisznó" && ( ... )}`
- Bírálati eredményközlő szám blokk köré:
  ```tsx
  {["🐗 Vaddisznó","🐏 Muflon","🦌 Gím Szarvas","🦌 Dám Szarvas","🦌 Szika Szarvas","🐏 Őz"].includes(formData.type)
    && formData.gender === "Hím" && ( ... )}
  ```

## Nem változik

- Más mezők, sorrend, mentési logika, `EditAnimalDialog`.
