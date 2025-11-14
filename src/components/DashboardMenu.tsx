import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, User, Users, FileText, Truck, Settings, LogOut, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TransportDocumentsDialog } from "@/components/TransportDocumentsDialog";
import { TransporterDialog } from "@/components/TransporterDialog";
import { PriceSettingsDialog } from "@/components/PriceSettingsDialog";
import { InviteUserDialog } from "@/components/InviteUserDialog";
import { Separator } from "@/components/ui/separator";

interface DashboardMenuProps {
  isAdmin: boolean;
  onLogout: () => void;
  onPriceUpdated: () => void;
}

export const DashboardMenu = ({ isAdmin, onLogout, onPriceUpdated }: DashboardMenuProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleNavigation = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="h-10 w-10">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Menü</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {/* Profil */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation("/profile")}
            >
              <User className="mr-2 h-4 w-4" />
              Profilom
            </Button>
          </div>

          {isAdmin && (
            <>
              <div className="ml-6 space-y-2">
                <div className="w-full">
                  <InviteUserDialog />
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Admin menü */}
          {isAdmin && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground px-2">Admin</p>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleNavigation("/users")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Felhasználók kezelése
                </Button>
              </div>
              <Separator />
            </>
          )}

          {/* Nyilvántartás */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground px-2">Nyilvántartás</p>
            <div className="space-y-2">
              <TransportDocumentsDialog />
              <TransporterDialog />
              <PriceSettingsDialog onPriceUpdated={onPriceUpdated} />
            </div>
          </div>

          <Separator />

          {/* Beállítások */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground px-2">Beállítások</p>
            <div className="flex items-center justify-between px-2">
              <span className="text-sm">Téma</span>
              <ThemeToggle />
            </div>
          </div>

          <Separator />

          {/* Kijelentkezés */}
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={() => {
              onLogout();
              setOpen(false);
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Kijelentkezés
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
