import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: "Hiba",
        description: "Kérjük, töltse ki az összes mezőt!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        toast({
          title: "Bejelentkezési hiba",
          description: error.message === "Invalid login credentials" 
            ? "Hibás email cím vagy jelszó!" 
            : error.message,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        toast({
          title: "Sikeres bejelentkezés!",
          description: "Üdvözöljük újra!",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: "Váratlan hiba történt. Kérjük, próbálja újra!",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/10 to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="text-center mb-2">
            <Link to="/" className="text-sm text-accent hover:underline">
              ← Vissza a főoldalra
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold text-center text-foreground">
            Bejelentkezés
          </CardTitle>
          <CardDescription className="text-center">
            Adja meg adatait a bejelentkezéshez
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email cím</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="pelda@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Jelszó</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Jelszó"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              variant="hunting"
              disabled={loading}
            >
              {loading ? "Bejelentkezés..." : "Bejelentkezés"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Még nincs fiókja?{" "}
              <Link to="/register" className="text-accent hover:underline font-medium">
                Regisztráció
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
