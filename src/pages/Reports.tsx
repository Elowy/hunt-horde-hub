import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CoolingRevenueReport } from "@/components/CoolingRevenueReport";
import { HuntingSeasonReport } from "@/components/HuntingSeasonReport";
import { HuntingEfficiency } from "@/components/HuntingEfficiency";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const Reports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const { limits, loading: subscriptionLoading } = useSubscription();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const { data: editorRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "editor")
      .maybeSingle();

    setIsAdmin(!!adminRole);
    setIsEditor(!!editorRole);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Betöltés...</p>
      </div>
    );
  }

  if (!limits.canViewReports) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader 
          isAdmin={isAdmin}
          isEditor={isEditor}
          onLogout={handleLogout}
        />
        
        <div className="container mx-auto py-6 px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Nincs hozzáférés</AlertTitle>
            <AlertDescription>
              A statisztikák és riportok funkció csak Normal és Pro előfizetéssel érhető el. Kérjük váltson Normal vagy Pro előfizetésre ezen funkciók használatához!
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => navigate("/subscriptions")}>
              Előfizetések megtekintése
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        isAdmin={isAdmin}
        isEditor={isEditor}
        onLogout={handleLogout}
      />
      
      <div className="container mx-auto py-6 px-4">
        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-forest-deep">Riportok</h2>
          <p className="text-muted-foreground">Statisztikai kimutatások és exportok</p>
        </div>

        {/* Riportok */}
        <div className="space-y-6">
          {/* Hűtési díj statisztikák */}
          <Card>
            <CardHeader>
              <CardTitle>Hűtési díj statisztikák</CardTitle>
              <CardDescription>
                Töltse le a hűtési díj bevételek részletes összesítőjét PDF formátumban (csak elszállított állatok)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  A riport tartalmazza:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
                  <li>Összesítő táblázat elszállítók szerint</li>
                  <li>Állatok száma, összes súly és bevétel elszállítónként</li>
                  <li>Részletes állat lista minden elszállítóra</li>
                  <li>Hűtési díj kalkuláció állatonként</li>
                  <li>Elszállítási dátumok</li>
                </ul>
                
                <div className="pt-4">
                  <CoolingRevenueReport />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vadelejtések összesítő */}
          <Card>
            <CardHeader>
              <CardTitle>Vadelejtések összesítő</CardTitle>
              <CardDescription>
                Töltse le a teljes vadászati idény vadelejtéseit Excel formátumban
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Az Excel riport tartalmazza:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
                  <li>Összesítő lap: Alapvető statisztikák és összesítők</li>
                  <li>Vadfajok lap: Vadfaj szerinti bontás</li>
                  <li>Részletes adatok lap: Minden állat összes adata</li>
                  <li>Állat azonosító, vadfaj, nem, osztály, súly</li>
                  <li>Vadász adatok, hűtési helyszín, biztonsági körzet</li>
                  <li>Dátumok: hűtés, mintavétel, lejárat, elszállítás</li>
                  <li>Állatorvosi vizsgálat adatok</li>
                  <li>Minden egyéb tárolt információ</li>
                </ul>
                
                <div className="pt-4">
                  <HuntingSeasonReport />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vadászati eredményesség */}
          <Card>
            <CardHeader>
              <CardTitle>Vadászati eredményesség</CardTitle>
              <CardDescription>
                Kimenetelek és elejtések részletes összehasonlítása
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Az elemzés tartalmazza:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
                  <li>Állat elejtés / beírás arány</li>
                  <li>Állat elejtés / kimenetel arány</li>
                  <li>Eredményes kimenetelek százaléka</li>
                  <li>Vendégek vs. tagok eredményességének összehasonlítása</li>
                  <li>Kimenetelek száma vs elejtett állatok száma</li>
                </ul>
                
                <div className="pt-4">
                  <HuntingEfficiency />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;
