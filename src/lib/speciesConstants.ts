// Common species list used across the application with emoji icons
export const SPECIES_OPTIONS = [
  { value: "🐏 Őz", label: "🐏 Őz" },
  { value: "🦌 Dám Szarvas", label: "🦌 Dám Szarvas" },
  { value: "🦌 Szika Szarvas", label: "🦌 Szika Szarvas" },
  { value: "🦌 Gím Szarvas", label: "🦌 Gím Szarvas" },
  { value: "🐗 Vaddisznó", label: "🐗 Vaddisznó" },
  { value: "🐏 Muflon", label: "🐏 Muflon" },
  { value: "🦊 Róka", label: "🦊 Róka" },
  { value: "🦡 Borz", label: "🦡 Borz" },
  { value: "🐰 Nyúl", label: "🐰 Nyúl" },
  { value: "🦆 Fácán", label: "🦆 Fácán" },
  { value: "🐦 Fogoly", label: "🐦 Fogoly" },
] as const;

export type SpeciesValue = typeof SPECIES_OPTIONS[number]['value'];
