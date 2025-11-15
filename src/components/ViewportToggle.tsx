import { Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export function ViewportToggle() {
  const [isMobileView, setIsMobileView] = useState(() => {
    const saved = localStorage.getItem("viewport-mode");
    return saved === "mobile";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isMobileView) {
      root.classList.add("mobile-viewport");
      localStorage.setItem("viewport-mode", "mobile");
    } else {
      root.classList.remove("mobile-viewport");
      localStorage.setItem("viewport-mode", "desktop");
    }
  }, [isMobileView]);

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setIsMobileView(!isMobileView)}
      className="h-10"
      title={isMobileView ? "Asztali nézet" : "Mobil nézet"}
    >
      <Monitor className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all mobile-viewport:rotate-90 mobile-viewport:scale-0" />
      <Smartphone className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all mobile-viewport:rotate-0 mobile-viewport:scale-100" />
      <span className="sr-only">Nézet váltás</span>
    </Button>
  );
}
