import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardMenu } from "@/components/DashboardMenu";
import { NotificationBell } from "@/components/NotificationBell";

interface PageHeaderProps {
  isAdmin?: boolean;
  isEditor?: boolean;
  isHunter?: boolean;
  onLogout?: () => void;
  onPriceUpdated?: () => void;
}

export const PageHeader = ({ 
  isAdmin = false, 
  isEditor = false, 
  isHunter = false,
  onLogout = () => {},
  onPriceUpdated = () => {}
}: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-forest-deep to-forest-light text-white shadow-md">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Title */}
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Vadgondok</h1>
          </div>

          {/* Center Dashboard Button with Deer in Sunglasses */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-white hover:bg-white/10 flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
          </Button>

          {/* Menu */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            <DashboardMenu 
              isAdmin={isAdmin}
              isEditor={isEditor}
              isHunter={isHunter}
              onLogout={onLogout}
              onPriceUpdated={onPriceUpdated}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
