import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";

interface HunterSociety {
  id: string;
  company_name: string;
}

interface HunterSocietySelectorProps {
  societies: HunterSociety[];
  selectedSociety: string | null;
  onSocietyChange: (societyId: string) => void;
}

export const HunterSocietySelector = ({
  societies,
  selectedSociety,
  onSocietyChange,
}: HunterSocietySelectorProps) => {
  if (societies.length <= 1) return null;

  return (
    <div className="mb-6 p-4 bg-card border rounded-lg">
      <div className="flex items-center gap-4">
        <Building2 className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <Label htmlFor="society-selector" className="text-sm text-muted-foreground">
            Vadásztársaság
          </Label>
          <Select value={selectedSociety || undefined} onValueChange={onSocietyChange}>
            <SelectTrigger id="society-selector" className="w-full mt-1">
              <SelectValue placeholder="Válasszon vadásztársaságot" />
            </SelectTrigger>
            <SelectContent>
              {societies.map((society) => (
                <SelectItem key={society.id} value={society.id}>
                  {society.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
