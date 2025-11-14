import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Animal {
  id: string;
  animal_id: string;
  species: string;
  gender: string | null;
  weight: number | null;
  class: string | null;
  cooling_date: string | null;
  storage_location_id: string;
  hunter_name: string | null;
  hunter_type: string | null;
  age: string | null;
  condition: string | null;
  sample_id: string | null;
  sample_date: string | null;
  expiry_date: string | null;
  vet_check: boolean | null;
  vet_notes: string | null;
  notes: string | null;
}

interface ViewAnimalDialogProps {
  animal: Animal;
  locationName: string;
  price: number;
}

export const ViewAnimalDialog = ({ animal, locationName, price }: ViewAnimalDialogProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Állat részletei</DialogTitle>
          <DialogDescription>
            {animal.species} - {animal.animal_id}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Alapadatok */}
          <div>
            <h3 className="font-semibold mb-3 text-lg">Alapadatok</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Azonosító</p>
                <p className="font-medium">{animal.animal_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vadfaj</p>
                <p className="font-medium">{animal.species}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nem</p>
                <p className="font-medium">{animal.gender || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Osztály</p>
                <p className="font-medium">{animal.class || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Súly</p>
                <p className="font-medium">{animal.weight ? `${animal.weight} kg` : "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Becsült ár</p>
                <p className="font-medium text-hunt-orange">
                  {price > 0 ? `${Math.round(price).toLocaleString("hu-HU")} Ft` : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kor</p>
                <p className="font-medium">{animal.age || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Állapot</p>
                <p className="font-medium">{animal.condition || "-"}</p>
              </div>
            </div>
          </div>

          {/* Helyszín és vadász */}
          <div>
            <h3 className="font-semibold mb-3 text-lg">Helyszín és vadász</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Hűtési helyszín</p>
                <Badge variant="outline">{locationName}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vadász neve</p>
                <p className="font-medium">{animal.hunter_name || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vadász típus</p>
                <p className="font-medium">{animal.hunter_type || "-"}</p>
              </div>
            </div>
          </div>

          {/* Dátumok */}
          <div>
            <h3 className="font-semibold mb-3 text-lg">Dátumok</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Hűtés dátuma</p>
                <p className="font-medium">
                  {animal.cooling_date
                    ? new Date(animal.cooling_date).toLocaleDateString("hu-HU")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lejárat</p>
                <p className="font-medium">
                  {animal.expiry_date
                    ? new Date(animal.expiry_date).toLocaleDateString("hu-HU")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mintavétel dátuma</p>
                <p className="font-medium">
                  {animal.sample_date
                    ? new Date(animal.sample_date).toLocaleDateString("hu-HU")
                    : "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Állatorvosi vizsgálat */}
          <div>
            <h3 className="font-semibold mb-3 text-lg">Állatorvosi vizsgálat</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Vizsgálat elvégezve</p>
                <Badge variant={animal.vet_check ? "default" : "secondary"}>
                  {animal.vet_check ? "Igen" : "Nem"}
                </Badge>
              </div>
              {animal.sample_id && (
                <div>
                  <p className="text-sm text-muted-foreground">Minta azonosító</p>
                  <p className="font-medium">{animal.sample_id}</p>
                </div>
              )}
              {animal.vet_notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Állatorvosi jegyzet</p>
                  <p className="font-medium">{animal.vet_notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Jegyzetek */}
          {animal.notes && (
            <div>
              <h3 className="font-semibold mb-3 text-lg">Jegyzetek</h3>
              <p className="text-sm">{animal.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
