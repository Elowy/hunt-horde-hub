import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building2, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
  if (societies.length === 0) return null;

  // If only one society, show it as a display field
  if (societies.length === 1) {
    return (
      <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Aktuális vadásztársaság
              </Label>
              <div className="mt-1 text-lg font-semibold text-foreground">
                {societies[0].company_name}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Multiple societies - show as full-width dropdown
  return (
    <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="p-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <Label htmlFor="society-selector" className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Válasszon vadásztársaságot
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {societies.length} vadásztársaság közül választhat
              </p>
            </div>
          </div>
          
          <Select value={selectedSociety || undefined} onValueChange={onSocietyChange}>
            <SelectTrigger id="society-selector" className="w-full h-12 text-base bg-background">
              <SelectValue placeholder="Válasszon vadásztársaságot" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {societies.map((society) => (
                <SelectItem 
                  key={society.id} 
                  value={society.id}
                  className="text-base py-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{society.company_name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
