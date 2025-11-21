import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  if (societies.length === 0) return null;

  const selectedSocietyName = societies.find(s => s.id === selectedSociety)?.company_name;

  return (
    <div className="mb-6 w-full">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-6 w-6 text-primary" />
            <Label className="text-lg font-semibold">Aktív vadásztársaság</Label>
          </div>
          {societies.length === 1 ? (
            <div className="text-2xl font-bold text-primary">
              {societies[0].company_name}
            </div>
          ) : (
            <Select value={selectedSociety || undefined} onValueChange={onSocietyChange}>
              <SelectTrigger className="w-full h-14 text-lg font-semibold">
                <SelectValue placeholder="Válasszon vadásztársaságot">
                  {selectedSocietyName && (
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5" />
                      {selectedSocietyName}
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {societies.map((society) => (
                  <SelectItem key={society.id} value={society.id} className="text-lg py-3">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5" />
                      {society.company_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
