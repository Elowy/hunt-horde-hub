import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, User, Users, FileText, Truck, Settings, LogOut, UserPlus, Crown, MapPin, CalendarCheck, Shield, BarChart, Trophy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ViewportToggle } from "@/components/ViewportToggle";
import { TransportDocumentsDialog } from "@/components/TransportDocumentsDialog";
import { TransporterDialog } from "@/components/TransporterDialog";
import { PriceSettingsDialog } from "@/components/PriceSettingsDialog";
import { InviteUserDialog } from "@/components/InviteUserDialog";
import { SettlementsAndZonesDialog } from "@/components/SettlementsAndZonesDialog";
import { AddAnimalDialog } from "@/components/AddAnimalDialog";
import { Separator } from "@/components/ui/separator";
import { useSubscription } from "@/hooks/useSubscription";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RoleSwitcher } from "@/components/RoleSwitcher";

interface DashboardMenuProps {
  isAdmin: boolean;
  isEditor: boolean;
  isHunter: boolean;
  onLogout: () => void;
  onPriceUpdated: () => void;
}

export const DashboardMenu = ({ isAdmin, isEditor, isHunter, onLogout, onPriceUpdated }: DashboardMenuProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { isPro, loading: subscriptionLoading } = useSubscription();
  const { isSuperAdmin } = useIsSuperAdmin();

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
      <SheetContent side="right" className="w-[300px] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Menü</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4 pb-8">
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
            {isAdmin && (
              <div className="ml-6">
                {subscriptionLoading ? (
                  <p className="text-xs text-muted-foreground px-2">Betöltés...</p>
                ) : isPro ? (
                  <InviteUserDialog />
                ) : (
                  <Alert className="border-yellow-500/50 bg-yellow-500/10 py-2">
                    <AlertDescription className="text-xs flex items-center gap-2">
                      <Crown className="h-3 w-3 text-yellow-600 dark:text-yellow-400 shrink-0" />
                      <span className="text-yellow-700 dark:text-yellow-300">
                        Csak Pro csomagban
                      </span>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Super Admin menü */}
          {isSuperAdmin && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground px-2">Super Admin</p>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-primary"
                  onClick={() => handleNavigation("/super-admin")}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Super Admin Dashboard
                </Button>
                <RoleSwitcher />
              </div>
              <Separator />
            </>
          )}

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
          {!isHunter && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground px-2">Nyilvántartás</p>
                <div className="space-y-2">
                  <AddAnimalDialog onAnimalAdded={onPriceUpdated} />
                  <TransportDocumentsDialog />
                  <TransporterDialog />
                  <PriceSettingsDialog onPriceUpdated={onPriceUpdated} />
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Vadászati */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground px-2">Vadászati</p>
            <div className="space-y-2">
              {subscriptionLoading ? (
                <p className="text-xs text-muted-foreground px-2">Betöltés...</p>
              ) : isPro ? (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigation("/hunting-registrations")}
                  >
                    <CalendarCheck className="mr-2 h-4 w-4" />
                    Vadászati beiratkozások
                  </Button>
                  {(isAdmin || isEditor) && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleNavigation("/hired-hunters")}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Bérvadászok
                    </Button>
                  )}
                </>
              ) : (
                <Alert className="border-yellow-500/50 bg-yellow-500/10 py-2 mx-2">
                  <AlertDescription className="text-xs flex items-center gap-2">
                    <Crown className="h-3 w-3 text-yellow-600 dark:text-yellow-400 shrink-0" />
                    <span className="text-yellow-700 dark:text-yellow-300">
                      Beiratkozások - Csak Pro
                    </span>
                  </AlertDescription>
                </Alert>
              )}
              {isAdmin && <SettlementsAndZonesDialog />}
            </div>
          </div>

          <Separator />

          {/* Riportok */}
          {!isHunter && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground px-2">Riportok</p>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleNavigation("/reports")}
                >
                  <BarChart className="mr-2 h-4 w-4" />
                  Hűtési díj statisztikák
                </Button>
                {(isAdmin || isEditor) && (
                  <>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleNavigation("/hunter-statistics")}
                    >
                      <Trophy className="mr-2 h-4 w-4" />
                      Vadász statisztikák
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleNavigation("/time-based-statistics")}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Időalapú statisztikák
                    </Button>
                  </>
                )}
              </div>

              <Separator />
            </>
          )}

          {/* Beállítások */}
          {!isHunter && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground px-2">Beállítások</p>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleNavigation("/settings")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Értesítések
                </Button>
                <div className="flex items-center justify-between px-2">
                  <span className="text-sm">Nézet</span>
                  <ViewportToggle />
                </div>
                <div className="flex items-center justify-between px-2">
                  <span className="text-sm">Téma</span>
                  <ThemeToggle />
                </div>
              </div>

              <Separator />

              {/* Előfizetések */}
              <Button
                variant="ghost"
                className="w-full justify-start bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                onClick={() => handleNavigation("/subscriptions")}
              >
                <Crown className="mr-2 h-4 w-4" />
                Előfizetések
              </Button>

              <Separator />
            </>
          )}

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
