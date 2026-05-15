import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AnimalStatus =
  | "elerheto"
  | "foglalva"
  | "szamlazva"
  | "elszallitva"
  | "archivalva";

export const ANIMAL_STATUS_LABELS: Record<AnimalStatus, string> = {
  elerheto: "Elérhető",
  foglalva: "Foglalva",
  szamlazva: "Számlázva",
  elszallitva: "Elszállítva",
  archivalva: "Archiválva",
};

const STATUS_CLASSES: Record<AnimalStatus, string> = {
  elerheto: "bg-green-500 hover:bg-green-600 text-white border-transparent",
  foglalva: "bg-yellow-500 hover:bg-yellow-600 text-white border-transparent",
  szamlazva: "bg-blue-500 hover:bg-blue-600 text-white border-transparent",
  elszallitva: "bg-slate-500 hover:bg-slate-600 text-white border-transparent",
  archivalva: "bg-muted text-muted-foreground border-transparent",
};

interface Props {
  status: AnimalStatus | string | null | undefined;
  className?: string;
}

export const AnimalStatusBadge = ({ status, className }: Props) => {
  const s = (status as AnimalStatus) || "elerheto";
  const label = ANIMAL_STATUS_LABELS[s] ?? "Elérhető";
  const cls = STATUS_CLASSES[s] ?? STATUS_CLASSES.elerheto;
  return (
    <Badge className={cn("text-xs", cls, className)}>
      {label}
    </Badge>
  );
};

export const ANIMAL_STATUSES: AnimalStatus[] = [
  "elerheto",
  "foglalva",
  "szamlazva",
  "elszallitva",
  "archivalva",
];

// User-modifiable statuses — `foglalva` and `szamlazva` are system-managed
export const USER_SETTABLE_STATUSES: AnimalStatus[] = [
  "elerheto",
  "elszallitva",
  "archivalva",
];
