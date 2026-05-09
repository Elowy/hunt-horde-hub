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

// Game type (Vad típus) options grouped by species.
// For species not listed here, the game type defaults to "Apróvad" and is locked.
export const GAME_TYPE_OPTIONS: Record<string, string[]> = {
  "🐗 Vaddisznó": ["Kan", "Koca", "Süldő", "Malac"],
  "🦌 Gím Szarvas": ["Borjú", "Ünő", "Bika", "Tehén"],
  "🦌 Szika Szarvas": ["Borjú", "Ünő", "Bika", "Tehén"],
  "🦌 Dám Szarvas": ["Borjú", "Ünő", "Bika", "Tehén"],
  "🐏 Muflon": ["Bárány", "Jerke", "Juh", "Kos"],
  "🐏 Őz": ["Gida", "Suta", "Bak"],
};

export const SMALL_GAME_TYPE = "Apróvad";

export const getGameTypesForSpecies = (species: string): string[] => {
  return GAME_TYPE_OPTIONS[species] ?? [];
};

export const isBigGameSpecies = (species: string): boolean => {
  return species in GAME_TYPE_OPTIONS;
};
