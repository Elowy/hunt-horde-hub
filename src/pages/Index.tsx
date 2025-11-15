import { useNavigate } from "react-router-dom";
import { ArrowRight, Shield, Database, Users, CheckCircle, LogIn, Crown, Mail, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-forest.jpg";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const features = [
    {
      icon: Database,
      title: "Vadászati Nyilvántartás",
      description: "Állat azonosítók, típusok, súlyok, helyszínek és hűtési állapotok pontos követése"
    },
    {
      icon: Shield,
      title: "Biztonságos Adattárolás", 
      description: "Professzionális szintű biztonság a vadászati nyilvántartásokhoz és céges adatokhoz"
    },
    {
      icon: Users,
      title: "Több Felhasználó",
      description: "Regisztrálja cégét és kezelje a csapat hozzáférését a nyilvántartási adatokhoz"
    }
  ];

  const benefits = [
    "Egyszerűsített állat nyilvántartás",
    "Professzionális tároló kezelés",
    "Valós idejű készlet követés", 
    "Biztonságos céges regisztráció",
    "Könnyen használható felület"
  ];

  const pricingTiers = [
    {
      name: "Ingyenes",
      price: "0 Ft",
      period: "",
      features: ["1 hűtési hely", "Korlátlan állat hozzáadása", "Alap funkciók"],
      highlighted: false
    },
    {
      name: "Normal",
      price: "1 950 Ft",
      period: "/hó",
      yearlyPrice: "18 720 Ft/év",
      features: ["1 hűtési hely", "Korlátlan állat hozzáadása"],
      highlighted: false
    },
    {
      name: "Pro",
      price: "4 950 Ft",
      period: "/hó",
      yearlyPrice: "47 520 Ft/év",
      features: ["Korlátlan hűtési hely", "Korlátlan állat hozzáadása", "Elektronikus beiratkozási rendszer", "Prioritás támogatás", "1 hónap ingyenes próba"],
      highlighted: true
    }
  ];

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    
    toast({
      title: "Sikeres feliratkozás!",
      description: "Köszönjük, hogy feliratkozott hírlevelünkre!",
    });
    setNewsletterEmail("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-forest-deep/95 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Vadgondok</h2>
            </div>
            
            <div className="flex items-center gap-4">
              {isLoggedIn ? (
                <Button
                  variant="ghost"
                  onClick={() => navigate("/dashboard")}
                  className="text-white hover:bg-white/10"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/login")}
                    className="text-white hover:bg-white/10"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Bejelentkezés
                  </Button>
                  <Button
                    variant="hunting"
                    onClick={() => navigate("/register")}
                  >
                    Regisztráció
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden pt-20">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-forest-deep/70"></div>
        </div>
        
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-6">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-accent">Vadgondnok</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto leading-relaxed">
            Professzionális állat nyilvántartás vadászati cégek számára. 
            Biztonságos, hatékony és modern megoldás a vadászati iparág számára.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="hunting" 
              size="lg" 
              className="text-lg px-8 py-6"
              onClick={() => navigate("/register")}
            >
              Regisztráció
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="text-lg px-8 py-6 bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={() => navigate("/login")}
            >
              <LogIn className="mr-2 h-5 w-5" />
              Bejelentkezés
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-earth-warm/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-forest-deep mb-4">
              Komplett Vadászati Nyilvántartás Kezelés
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Minden ami szükséges a vadászati cég állat tárolásának és nyilvántartásának kezeléséhez
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="w-16 h-16 mx-auto mb-4 bg-forest-deep/10 rounded-full flex items-center justify-center">
                    <feature.icon className="h-8 w-8 text-forest-deep" />
                  </div>
                  <CardTitle className="text-forest-deep">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gradient-to-br from-earth-warm/20 to-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-forest-deep mb-4">
              Válassza ki az Önnek megfelelő csomagot
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Minden új felhasználó 1 hónap ingyenes Pro próbaidőszakot kap regisztráció és hírlevél feliratkozás után
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <Card 
                key={index} 
                className={`relative ${tier.highlighted ? 'border-accent border-2 shadow-xl scale-105' : ''}`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-accent text-accent-foreground px-4 py-1">
                      <Crown className="h-4 w-4 mr-1 inline" />
                      Ajánlott
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl text-forest-deep">{tier.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground">{tier.period}</span>
                    {tier.yearlyPrice && (
                      <p className="text-sm text-muted-foreground mt-1">vagy {tier.yearlyPrice}</p>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant={tier.highlighted ? "hunting" : "outline"}
                    className="w-full mt-6"
                    onClick={() => navigate("/register")}
                  >
                    {tier.name === "Ingyenes" ? "Kezdés" : "Előfizetés"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-forest-deep mb-6">
                Miért válassza a Vadgondnokot?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Kifejezetten vadászati cégek számára készült, platformunk biztosítja a szükséges 
                eszközöket az állat nyilvántartás professzionális pontosságú kezeléséhez.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <Card className="p-8">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl text-forest-deep">Készen áll a kezdésre?</CardTitle>
                <CardDescription className="text-base">
                  Csatlakozzon a platformunkat használó vadászati cégek növekvő számához
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="hunting" 
                  className="w-full" 
                  size="lg"
                  onClick={() => navigate("/register")}
                >
                  Regisztrálja Cégét Most
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-forest-deep text-white py-12">
        <div className="container mx-auto px-6">
          <div className="max-w-md mx-auto mb-8">
            <h3 className="text-xl font-bold mb-4 text-center">Iratkozzon fel hírlevelünkre</h3>
            <p className="text-white/80 mb-4 text-center text-sm">
              Kapjon 1 hónap ingyenes Pro előfizetést regisztráció után!
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <Input
                type="email"
                placeholder="Email cím"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                required
              />
              <Button type="submit" variant="secondary">
                <Mail className="h-4 w-4 mr-2" />
                Feliratkozás
              </Button>
            </form>
          </div>
          
          <div className="text-center border-t border-white/20 pt-8">
            <h3 className="text-2xl font-bold mb-4">Vadászati Hűtés Kezelő</h3>
            <p className="text-white/80 mb-6">
              Professzionális állat nyilvántartás kezelés a modern vadászati iparág számára
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="secondary"
                size="lg"
                className="text-lg px-8 py-6 text-foreground"
              >
                Kapcsolat
              </Button>
              <Button 
                variant="default"
                size="lg"
                className="text-lg px-8 py-6 bg-foreground text-background hover:bg-foreground/90"
              >
                Adatvédelem
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
