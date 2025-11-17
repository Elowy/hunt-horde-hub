import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Company = {
  name: string;
};

export const CompanySwitcher = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCompaniesAndSetDefault();
  }, []);

  const loadCompaniesAndSetDefault = async () => {
    setLoading(true);
    try {
      // First fetch current user's profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_name")
        .eq("id", user.id)
        .single();

      // Fetch all companies
      await fetchCompanies();

      // Set default company
      const stored = localStorage.getItem("impersonate_company");
      if (stored) {
        setSelectedCompany(stored);
      } else if (profile?.company_name) {
        // Set to user's company by default
        setSelectedCompany(profile.company_name);
        localStorage.setItem("impersonate_company", profile.company_name);
      } else {
        // Default to "all"
        setSelectedCompany("all");
        localStorage.setItem("impersonate_company", "all");
      }
    } catch (error) {
      console.error("Error loading companies:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("company_name, user_type")
        .not("company_name", "is", null)
        .in("user_type", ["hunter_society", "buyer"])
        .order("company_name");

      if (error) throw error;

      // Get unique company names
      const uniqueCompanies = Array.from(
        new Set(data.map((p) => p.company_name).filter(Boolean))
      ).map((name) => ({ name: name as string }));

      setCompanies(uniqueCompanies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a cégeket",
        variant: "destructive",
      });
    }
  };

  const handleCompanyChange = (company: string) => {
    setSelectedCompany(company);
    localStorage.setItem("impersonate_company", company);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="space-y-2 px-2">
        <Label className="text-xs flex items-center gap-2">
          <Building2 className="h-3 w-3" />
          Cég váltás (Super Admin)
        </Label>
        <div className="text-xs text-muted-foreground">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-2">
      <Label className="text-xs flex items-center gap-2">
        <Building2 className="h-3 w-3" />
        Cég váltás (Super Admin)
      </Label>
      <Select value={selectedCompany} onValueChange={handleCompanyChange}>
        <SelectTrigger className="w-full">
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
  );
};

export const getActiveCompany = (): string | null => {
  const stored = localStorage.getItem("impersonate_company");
  return stored === "all" ? null : stored;
};
