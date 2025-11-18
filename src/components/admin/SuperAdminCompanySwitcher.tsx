import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

type Company = {
  name: string;
};

export const SuperAdminCompanySwitcher = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("company_name, user_type")
        .not("company_name", "is", null)
        .in("user_type", ["hunter_society", "buyer"])
        .order("company_name");

      if (error) throw error;

      const uniqueCompanies = Array.from(
        new Set(data.map((p) => p.company_name).filter(Boolean))
      ).map((name) => ({ name: name as string }));

      setCompanies(uniqueCompanies);

      const stored = localStorage.getItem("test_company_filter");
      if (stored) {
        setSelectedCompany(stored);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a cégeket",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (company: string) => {
    setSelectedCompany(company);
    localStorage.setItem("test_company_filter", company);
    window.location.reload();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Cég szűrés tesztelés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Betöltés...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Cég adatok megtekintése
        </CardTitle>
        <CardDescription>
          Válasszon céget a Dashboard adatainak megtekintéséhez. Ez csak a nézetet változtatja, nem a jogosultságokat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Ez csak megtekintési célokat szolgál. A valódi adathozzáférés továbbra is a szerveren ellenőrzött.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          <Label>Megtekintendő cég</Label>
          <Select value={selectedCompany} onValueChange={handleCompanyChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Összes cég</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.name} value={company.name}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export const getTestCompanyFilter = (): string | null => {
  const stored = localStorage.getItem("test_company_filter");
  return stored === "all" ? null : stored;
};
