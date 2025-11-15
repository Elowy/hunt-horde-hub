import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DashboardMenu } from "@/components/DashboardMenu";
import deerLogo from "@/assets/deer-logo-white.png";

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
    <div className="bg-gradient-to-r from-forest-deep to-forest-light text-white">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Title */}
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Vadgondok</h1>
          </div>

          {/* Center Dashboard Button with Deer Logo */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-white hover:bg-white/10 flex items-center gap-2 p-2"
          >
            <img src={deerLogo} alt="Vadgondok logo" className="h-8 w-8" />
          </Button>

          {/* Menu */}
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
  );
};
