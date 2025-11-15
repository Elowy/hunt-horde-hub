import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Crown, Check, Loader2, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { RedeemCodeDialog } from "@/components/RedeemCodeDialog";
import { useSubscription } from "@/hooks/useSubscription";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

const SUBSCRIPTION_TIERS = {
  free: {
    name: "Ingyenes",
    features: ["1 hűtési hely", "Maximum 100 állat"],
    price: "0 Ft",
    product_id: null,
  },
  normal_monthly: {
    name: "Normal - Havi",
    features: ["Korlátlan hűtési hely", "Korlátlan állatok", "Statisztikák, jelentések", "Közepes támogatás (48h)"],
    price: "1 950 Ft/hó",
    price_id: "price_1STVU8G2Zidvt9jUBO5yBhEx",
    product_id: "prod_TQMCKFFwVc6lXT",
  },
  normal_yearly: {
    name: "Normal - Éves",
    features: ["Korlátlan hűtési hely", "Korlátlan állatok", "Statisztikák, jelentések", "Közepes támogatás (48h)", "20% megtakarítás"],
    price: "18 720 Ft/év",
    savings: "(1 560 Ft/hó)",
    price_id: "price_1STVUFG2Zidvt9jUlxDihADG",
    product_id: "prod_TQMCwp0XrDYkOB",
  },
  pro_monthly: {
    name: "Pro - Havi",
    features: ["Korlátlan hűtési hely", "Korlátlan állatok", "Elektronikus beiratkozás", "Vadászok kezelése", "Meghívások", "Statisztikák, jelentések", "Magas támogatás (24h)"],
    price: "4 950 Ft/hó",
    price_id: "price_1STVUGG2Zidvt9jUbzxwXRRf",
    product_id: "prod_TQMCsYuGXl2cqX",
  },
  pro_yearly: {
    name: "Pro - Éves",
    features: ["Korlátlan hűtési hely", "Korlátlan állatok", "Elektronikus beiratkozás", "Vadászok kezelése", "Meghívások", "Statisztikák, jelentések", "Magas támogatás (24h)", "20% megtakarítás"],
    price: "47 520 Ft/év",
    savings: "(3 960 Ft/hó)",
    price_id: "price_1STVUHG2Zidvt9jU5eKdE2B6",
    product_id: "prod_TQMCzW95I3TlPz",
  },
};

const Subscriptions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentProductId, setCurrentProductId] = useState<string | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    type: string;
    expiresAt?: string;
    tier?: string;
  } | null>(null);
  const { tier, limits } = useSubscription();
  const [storageLocationCount, setStorageLocationCount] = useState(0);
  const [animalCount, setAnimalCount] = useState(0);

  useEffect(() => {
    checkSubscription();
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { count: storageCount } = await supabase
        .from("storage_locations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id);

      const { count: animalsCount } = await supabase
        .from("animals")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id);

      setStorageLocationCount(storageCount || 0);
      setAnimalCount(animalsCount || 0);
    } catch (error) {
      console.error("Error fetching usage data:", error);
    }
  };

  const checkSubscription = async () => {
    try {
      setCheckingSubscription(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      // Ellenőrizzük a próbaidőszakot
      const { data: trialData } = await supabase
        .from("trial_subscriptions")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (trialData) {
        const expiresAt = new Date(trialData.expires_at);
        const now = new Date();
        
        if (expiresAt > now) {
          setCurrentProductId("trial_pro");
          setSubscriptionStatus({
            type: "Próbaidőszak",
            expiresAt: trialData.expires_at,
            tier: "Pro"
          });
          setCheckingSubscription(false);
          return;
        }
      }

      // Ellenőrizzük az örökös előfizetéseket
      const { data: lifetimeData } = await supabase
        .from("lifetime_subscriptions")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (lifetimeData) {
        setCurrentProductId(lifetimeData.tier);
        setSubscriptionStatus({
          type: "Örökös előfizetés",
          tier: lifetimeData.tier
        });
        setCheckingSubscription(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      setCurrentProductId(data.product_id);
      
      if (data.subscribed && data.product_id) {
        const tier = Object.entries(SUBSCRIPTION_TIERS).find(
          ([_, value]) => value.product_id === data.product_id
        )?.[1];
        
        setSubscriptionStatus({
          type: "Aktív előfizetés",
          expiresAt: data.subscription_end,
          tier: tier?.name || "Ismeretlen"
        });
      } else {
        setSubscriptionStatus({
          type: "Ingyenes",
          tier: "Free"
        });
      }
    } catch (error: any) {
      console.error("Error checking subscription:", error);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleSubscribe = async (priceId: string) => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message || "Nem sikerült létrehozni az előfizetést",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message || "Nem sikerült megnyitni a kezelő portált",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Vissza a Dashboard-hoz
          </Button>
          <RedeemCodeDialog onCodeRedeemed={checkSubscription} />
        </div>

        {/* Jelenlegi előfizetési státusz */}
        {subscriptionStatus && (
          <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Jelenlegi előfizetési státusz
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Típus:</span>
                <Badge variant="secondary" className="text-base">
                  {subscriptionStatus.type}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Csomag:</span>
                <span className="font-semibold">{subscriptionStatus.tier}</span>
              </div>
              {subscriptionStatus.expiresAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Lejárat:</span>
                  <span className="font-semibold">
                    {new Date(subscriptionStatus.expiresAt).toLocaleDateString('hu-HU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Előfizetési kvóták és használat */}
        <Card className="border-primary/20 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Előfizetési kvóták és használat
            </CardTitle>
            <CardDescription>
              {tier === "free" && "Ingyenes csomag"}
              {tier === "normal" && "Normal csomag"}
              {tier === "pro" && "Pro csomag"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Hűtési helyek */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Hűtési helyek</span>
                <span className="font-medium">
                  {storageLocationCount}
                  {limits.maxStorageLocations !== null ? ` / ${limits.maxStorageLocations}` : " / ∞"}
                </span>
              </div>
              {limits.maxStorageLocations !== null && (
                <>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        storageLocationCount >= limits.maxStorageLocations 
                          ? "bg-destructive" 
                          : "bg-primary"
                      }`}
                      style={{ 
                        width: `${Math.min((storageLocationCount / limits.maxStorageLocations) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  {storageLocationCount >= limits.maxStorageLocations && (
                    <Badge variant="destructive" className="text-xs">
                      Limit elérve!
                    </Badge>
                  )}
                </>
              )}
            </div>

            {/* Állatok */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Állatok</span>
                <span className="font-medium">
                  {animalCount}
                  {limits.maxAnimals !== null ? ` / ${limits.maxAnimals}` : " / ∞"}
                </span>
              </div>
              {limits.maxAnimals !== null && (
                <>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        animalCount >= limits.maxAnimals 
                          ? "bg-destructive" 
                          : "bg-primary"
                      }`}
                      style={{ 
                        width: `${Math.min((animalCount / limits.maxAnimals) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  {animalCount >= limits.maxAnimals && (
                    <Badge variant="destructive" className="text-xs">
                      Limit elérve!
                    </Badge>
                  )}
                </>
              )}
            </div>

            <Separator />

            {/* Elérhető funkciók */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Elérhető funkciók:</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  {limits.canViewReports ? (
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>Statisztikák, jelentések</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {limits.canUseElectronicRegistration ? (
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>Elektronikus beiratkozás</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {limits.canManageHunters ? (
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>Vadászok kezelése</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {limits.canSendInvitations ? (
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>Meghívások küldése</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            Előfizetési Csomagok
          </h1>
          <p className="text-muted-foreground">Válassza ki az Önnek megfelelő csomagot</p>
        </div>

        {/* Ingyenes csomag - teljes szélesség */}
        <div className="mb-6">
          {(() => {
            const [key, tier] = Object.entries(SUBSCRIPTION_TIERS)[0];
            const isCurrentPlan = tier.product_id === currentProductId;
            const isFree = key === "free";
            const isCurrentlyFree = currentProductId === null;

            return (
              <Card key={key} className={`relative ${isCurrentPlan ? "border-primary border-2" : ""}`}>
                {isCurrentPlan && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Jelenlegi csomag
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {tier.name}
                    {!isFree && <Crown className="h-5 w-5 text-yellow-500" />}
                  </CardTitle>
                  <CardDescription>
                    <span className="text-2xl font-bold text-foreground">{tier.price}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isFree && isCurrentlyFree ? (
                    <Button disabled className="w-full">Jelenlegi csomag</Button>
                  ) : (
                    <Button variant="outline" disabled className="w-full">Ingyenes</Button>
                  )}
                </CardFooter>
              </Card>
            );
          })()}
        </div>

        {/* Normal csomagok - 2 oszlop */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {Object.entries(SUBSCRIPTION_TIERS).slice(1, 3).map(([key, tier]) => {
            const isCurrentPlan = tier.product_id === currentProductId;

            return (
              <Card key={key} className={`relative ${isCurrentPlan ? "border-primary border-2" : ""}`}>
                {isCurrentPlan && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Jelenlegi csomag
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {tier.name}
                    <Crown className="h-5 w-5 text-yellow-500" />
                  </CardTitle>
                  <CardDescription>
                    <span className="text-2xl font-bold text-foreground">{tier.price}</span>
                    {'savings' in tier && tier.savings && (
                      <span className="block text-sm text-green-600 dark:text-green-400">{tier.savings}</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrentPlan ? (
                    <Button onClick={handleManageSubscription} disabled={loading} className="w-full">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Előfizetés kezelése"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => 'price_id' in tier && handleSubscribe(tier.price_id)}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Előfizetés"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Pro csomagok - 2 oszlop */}
        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(SUBSCRIPTION_TIERS).slice(3).map(([key, tier]) => {
            const isCurrentPlan = tier.product_id === currentProductId;

            return (
              <Card key={key} className={`relative ${isCurrentPlan ? "border-primary border-2" : ""}`}>
                {isCurrentPlan && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Jelenlegi csomag
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {tier.name}
                    <Crown className="h-5 w-5 text-yellow-500" />
                  </CardTitle>
                  <CardDescription>
                    <span className="text-2xl font-bold text-foreground">{tier.price}</span>
                    {'savings' in tier && tier.savings && (
                      <span className="block text-sm text-green-600 dark:text-green-400">{tier.savings}</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrentPlan ? (
                    <Button onClick={handleManageSubscription} disabled={loading} className="w-full">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Előfizetés kezelése"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => 'price_id' in tier && handleSubscribe(tier.price_id)}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Előfizetés"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Subscriptions;
