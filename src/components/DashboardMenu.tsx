import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, User, Users, FileText, Truck, Settings, LogOut, UserPlus, Crown, MapPin, CalendarCheck, Shield, BarChart, Trophy, Clock, Archive, Package, MessageSquare, History, File, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ViewportToggle } from "@/components/ViewportToggle";
import { TransportDocumentsDialog } from "@/components/TransportDocumentsDialog";
import { BuyerTransportDocuments } from "@/components/BuyerTransportDocuments";
import { PriceProposalsDialog } from "@/components/PriceProposalsDialog";
import { TransporterDialog } from "@/components/TransporterDialog";
import { PriceSettingsDialog } from "@/components/PriceSettingsDialog";
import { InviteUserDialog } from "@/components/InviteUserDialog";
import { AddExistingHunterDialog } from "@/components/AddExistingHunterDialog";
import { SettlementsAndZonesDialog } from "@/components/SettlementsAndZonesDialog";
import { SecurityZoneClosuresDialog } from "@/components/SecurityZoneClosuresDialog";
import { AddAnimalDialog } from "@/components/AddAnimalDialog";
import { GuestRegistrationQRDialog } from "@/components/GuestRegistrationQRDialog";
import { BuyerPriceProposalDialog } from "@/components/BuyerPriceProposalDialog";
import { Separator } from "@/components/ui/separator";
import { useSubscription } from "@/hooks/useSubscription";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

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
  const [isBuyer, setIsBuyer] = useState(false);
  const [isHunterSociety, setIsHunterSociety] = useState(false);
  const [societyIsPro, setSocietyIsPro] = useState(false);
  const { isPro, loading: subscriptionLoading } = useSubscription();
  const { isSuperAdmin } = useIsSuperAdmin();

  // Check if user is a buyer and check hunter society subscription status
  useEffect(() => {
    const checkUserStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check buyer status
      const { data: buyer } = await supabase
        .from("buyers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      setIsBuyer(!!buyer);

      // Check profile and hunter society subscription
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type, hunter_society_id")
        .eq("id", user.id)
        .single();

      if (profile) {
        setIsHunterSociety(profile.user_type === "hunter_society");

        // If user is a hunter (tag), check their society's subscription
        if (profile.user_type !== "hunter_society" && profile.hunter_society_id) {
          // Check if the hunter society has a trial subscription
          const { data: trialData } = await supabase
            .from("trial_subscriptions")
            .select("*")
            .eq("user_id", profile.hunter_society_id)
            .single();

          if (trialData) {
            const expiresAt = new Date(trialData.expires_at);
            const now = new Date();
            if (expiresAt > now) {
              setSocietyIsPro(true);
              return;
            }
          }

          // Check if society has lifetime subscription
          const { data: lifetimeData } = await supabase
            .from("lifetime_subscriptions")
            .select("tier")
            .eq("user_id", profile.hunter_society_id)
            .single();

          if (lifetimeData && lifetimeData.tier === "pro") {
            setSocietyIsPro(true);
            return;
          }

          // If no trial or lifetime, check via Stripe
          // For simplicity, we'll default to false if no active subscription found above
          setSocietyIsPro(false);
        }
      }
    };

    if (open) {
      checkUserStatus();
    }
  }, [open]);

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
          {/* For hunters: simplified menu */}
          {isHunter ? (
            <>
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

              <Separator />

              {/* Beállítások */}
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleNavigation("/settings")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Beállítások
                </Button>
              </div>

              <Separator />

              {/* Támogatás */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground px-2">Támogatás</p>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleNavigation("/tickets")}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Támogatási jegyek
                </Button>
              </div>

              <Separator />

              {/* Kijelentkezés */}
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Kijelentkezés
              </Button>
            </>
          ) : (
            <>
              {/* Full menu for non-hunters */}
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
              <div className="ml-6 space-y-2">
                {subscriptionLoading ? (
                  <p className="text-xs text-muted-foreground px-2">Betöltés...</p>
                ) : isPro ? (
                  <>
                    <InviteUserDialog />
                    <AddExistingHunterDialog />
                  </>
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
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleNavigation("/activity-log")}
                >
                  <History className="mr-2 h-4 w-4" />
                  Tevékenység
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
                  {(isAdmin || isEditor) && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleNavigation("/pending-animals")}
                    >
                      <CheckSquare className="mr-2 h-4 w-4" />
                      Jóváhagyásra váró állatok
                    </Button>
                  )}
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Felvásárlások */}
          {!isHunter && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground px-2">Felvásárlások</p>
                <div className="space-y-2">
                  <TransportDocumentsDialog />
                  <TransporterDialog />
                  <PriceSettingsDialog onPriceUpdated={onPriceUpdated} />
                  {isAdmin && <PriceProposalsDialog />}
                  {isBuyer && (
                    <>
                      <BuyerPriceProposalDialog />
                      <BuyerTransportDocuments />
                    </>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigation("/transport-archive")}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Elszállítási archívum
                  </Button>
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Vadászat */}
          {!(isHunter && !societyIsPro) && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground px-2">Vadászat</p>
                <div className="space-y-2">
                  {subscriptionLoading ? (
                    <p className="text-xs text-muted-foreground px-2">Betöltés...</p>
                  ) : (isPro || (isHunter && societyIsPro)) ? (
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
                        <>
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => handleNavigation("/hired-hunters")}
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Bérvadászok
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => handleNavigation("/zone-statistics")}
                          >
                            <MapPin className="mr-2 h-4 w-4" />
                            Terület statisztikák
                          </Button>
                        </>
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
                  {(isAdmin || isEditor) && (
                    <>
                      <SettlementsAndZonesDialog />
                      <SecurityZoneClosuresDialog />
                      <GuestRegistrationQRDialog />
                    </>
                  )}
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Riportok */}
          {((isHunter && societyIsPro) || (!isHunter && !isBuyer)) && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground px-2">Riportok</p>
                {subscriptionLoading ? (
                  <p className="text-xs text-muted-foreground px-2">Betöltés...</p>
                ) : (isPro || (isHunter && societyIsPro)) ? (
                  <>
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
                  </>
                ) : isHunterSociety ? (
                  <Alert className="border-yellow-500/50 bg-yellow-500/10 py-2 mx-2">
                    <AlertDescription className="text-xs flex items-center gap-2">
                      <Crown className="h-3 w-3" />
                      Statisztikák - Csak Pro
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>

              <Separator />
            </>
          )}

          {/* Dokumentumok - Csak vadásztársaságoknak és Pro verzióval */}
          {!isHunter && !isBuyer && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground px-2">Tagdíjak</p>
                {subscriptionLoading ? (
                  <p className="text-xs text-muted-foreground px-2">Betöltés...</p>
                ) : isPro ? (
                  <>
                    {(isAdmin || isEditor) && (
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigation("/membership-payments")}
                      >
                        <Package className="mr-2 h-4 w-4" />
                        Tagdíjak kezelése
                      </Button>
                    )}
                  </>
                ) : isHunterSociety ? (
                  <Alert className="border-yellow-500/50 bg-yellow-500/10 py-2 mx-2">
                    <AlertDescription className="text-xs flex items-center gap-2">
                      <Crown className="h-3 w-3" />
                      Tagdíj - Csak Pro
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>

              <Separator />
            </>
          )}

          {/* Dokumentumok - Csak vadásztársaságoknak és Pro verzióval */}
          {!isHunter && !isBuyer && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground px-2">Dokumentumok</p>
                {subscriptionLoading ? (
                  <p className="text-xs text-muted-foreground px-2">Betöltés...</p>
                ) : isPro ? (
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigation("/documents")}
                  >
                    <File className="mr-2 h-4 w-4" />
                    Dokumentumok
                  </Button>
                ) : (
                  <Alert className="border-yellow-500/50 bg-yellow-500/10 py-2 mx-2">
                    <AlertDescription className="text-xs flex items-center gap-2">
                      <Crown className="h-3 w-3 text-yellow-600 dark:text-yellow-400 shrink-0" />
                      <span className="text-yellow-700 dark:text-yellow-300">
                        Dokumentumok - Csak Pro
                      </span>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Separator />
            </>
          )}

          {/* Beállítások */}
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

          {/* Támogatás */}
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleNavigation("/tickets")}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Támogatási jegyek
          </Button>

          <Separator />

          {/* Előfizetések - only for non-hunters */}
          {!isHunter && (
            <>
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
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
