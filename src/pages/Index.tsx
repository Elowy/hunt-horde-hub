import { useNavigate } from "react-router-dom";
import { ArrowRight, Shield, Database, Users, CheckCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import heroImage from "@/assets/hero-forest.jpg";

const Index = () => {
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-forest-deep/70"></div>
        </div>
        
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-6">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Vadászati Hűtés <span className="text-hunt-orange">Kezelő</span>
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
            <Button 
              variant="outline" 
              size="lg"
              className="text-lg px-8 py-6 bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={() => navigate("/dashboard")}
            >
              Demó Megtekintése
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

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-forest-deep mb-6">
                Miért válassza a Vadászati Hűtés Kezelőt?
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
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/dashboard")}
                >
                  Fedezze Fel a Demót
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-forest-deep text-white py-12">
        <div className="container mx-auto px-6 text-center">
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
      </footer>
    </div>
  );
};

export default Index;
