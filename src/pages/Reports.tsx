import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CoolingRevenueReport } from "@/components/CoolingRevenueReport";
import { HuntingSeasonReport } from "@/components/HuntingSeasonReport";
import { supabase } from "@/integrations/supabase/client";

const Reports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
    } else {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Betöltés...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Riportok</h1>
              <p className="text-muted-foreground">Statisztikai kimutatások és exportok</p>
            </div>
          </div>
        </div>

        {/* Riportok */}
        <div className="space-y-6">
          {/* Hűtési díj statisztikák */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileDown className="h-5 w-5" />
                <CardTitle>Hűtési díj statisztikák</CardTitle>
              </div>
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
              <div className="flex items-center gap-2">
                <FileDown className="h-5 w-5" />
                <CardTitle>Vadelejtések összesítő</CardTitle>
              </div>
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
        </div>
      </div>
    </div>
  );
};

export default Reports;
