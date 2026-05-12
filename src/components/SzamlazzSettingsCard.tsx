import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SzamlazzSettingsCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [prefix, setPrefix] = useState("VG");
  const [hasKey, setHasKey] = useState(false);
  const [newKey, setNewKey] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("szamlazz_enabled, szamlazz_invoice_prefix, szamlazz_agent_key")
        .eq("id", user.id)
        .single();
      if (data) {
        setEnabled(!!data.szamlazz_enabled);
        setPrefix(data.szamlazz_invoice_prefix ?? "VG");
        setHasKey(!!data.szamlazz_agent_key);
      }
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const update: Record<string, any> = {
        szamlazz_enabled: enabled,
        szamlazz_invoice_prefix: prefix || "VG",
      };
      if (newKey.trim().length > 0) {
        update.szamlazz_agent_key = newKey.trim();
      }
      const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
      if (error) throw error;
      toast({ title: "Mentve", description: "A Számlázz.hu beállítások frissítve." });
      setNewKey("");
      await load();
    } catch (e: any) {
      toast({ title: "Hiba", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Számlázz.hu integráció</CardTitle>
        <CardDescription>
          Vadásztársasági Számla Agent kulcs a saját számlák kiállításához.{" "}
          <a
            href="https://docs.szamlazz.hu/hu/agent/basics/authentication"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 underline"
          >
            Agent kulcs igénylése <ExternalLink className="h-3 w-3" />
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Számlázás aktiválása</Label>
                <p className="text-sm text-muted-foreground">
                  Engedélyezi a számlák kiállítását a Számlázz.hu-n keresztül.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="szlhu-prefix">Számla előtag</Label>
              <Input
                id="szlhu-prefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="VG"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="szlhu-key">
                Számla Agent kulcs {hasKey && <span className="text-xs text-muted-foreground">(beállítva)</span>}
              </Label>
              <Input
                id="szlhu-key"
                type="password"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder={hasKey ? "Hagyd üresen ha nem változik" : "Új Agent kulcs"}
              />
              <p className="text-xs text-muted-foreground">
                A kulcs titkosítatlan, RLS szabályok védik. Csak a saját társasághoz használt.
              </p>
            </div>

            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Beállítások mentése
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
