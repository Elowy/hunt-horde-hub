import { useNavigate } from "react-router-dom";
import { ArrowRight, Shield, Database, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import heroImage from "@/assets/hero-forest.jpg";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Database,
      title: "Animal Inventory Management",
      description: "Track animal IDs, types, weights, locations, and storage status with precision"
    },
    {
      icon: Shield,
      title: "Secure Data Storage", 
      description: "Professional-grade security for your hunting records and company information"
    },
    {
      icon: Users,
      title: "Multi-User Access",
      description: "Register your hunting company and manage team access to inventory data"
    }
  ];

  const benefits = [
    "Streamlined animal record keeping",
    "Professional storage management",
    "Real-time inventory tracking", 
    "Secure company registration",
    "Easy-to-use dashboard interface"
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
            Hunt Storage <span className="text-hunt-orange">Solutions</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto leading-relaxed">
            Professional animal inventory management for hunting companies. 
            Secure, efficient, and built for the modern hunting industry.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="hunting" 
              size="lg" 
              className="text-lg px-8 py-6"
              onClick={() => navigate("/register")}
            >
              Register Your Company
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="text-lg px-8 py-6 bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={() => navigate("/dashboard")}
            >
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-earth-warm/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-forest-deep mb-4">
              Complete Hunting Inventory Management
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage your hunting company's animal storage and records
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
                Why Choose Hunt Storage Solutions?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Built specifically for hunting companies, our platform provides the tools 
                you need to manage your animal inventory with professional precision.
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
                <CardTitle className="text-2xl text-forest-deep">Ready to Get Started?</CardTitle>
                <CardDescription className="text-base">
                  Join the growing number of hunting companies using our platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="hunting" 
                  className="w-full" 
                  size="lg"
                  onClick={() => navigate("/register")}
                >
                  Register Your Company Now
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/dashboard")}
                >
                  Explore Dashboard Demo
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-forest-deep text-white py-12">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-2xl font-bold mb-4">Hunt Storage Solutions</h3>
          <p className="text-white/80 mb-6">
            Professional animal inventory management for the modern hunting industry
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" className="text-white border-white/20 hover:bg-white/10">
              Contact Support
            </Button>
            <Button variant="link" className="text-white hover:text-hunt-orange">
              Privacy Policy
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
