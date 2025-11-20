import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { DashboardMenu } from "@/components/DashboardMenu";
import { PendingAnimalsList } from "@/components/PendingAnimalsList";

export default function PendingAnimals() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    // Check if user has admin or editor role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    if (roles) {
      const userRoles = roles.map(r => r.role);
      setIsAdmin(userRoles.includes("admin") || userRoles.includes("super_admin"));
      setIsEditor(userRoles.includes("editor"));

      // If not admin or editor, redirect to dashboard
      if (!userRoles.includes("admin") && !userRoles.includes("editor") && !userRoles.includes("super_admin")) {
        navigate("/dashboard");
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        isAdmin={isAdmin}
        isEditor={isEditor}
        isHunter={false}
        onLogout={handleLogout}
        onPriceUpdated={() => {}}
      />
      
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Jóváhagyásra váró állatok</h1>
          <p className="text-muted-foreground mt-2">
            QR kódos beküldések kezelése és jóváhagyása
          </p>
        </div>

        <PendingAnimalsList />
      </div>
    </div>
  );
}
