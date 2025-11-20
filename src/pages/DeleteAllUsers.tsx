import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DeleteAllUsers = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDeleteAllUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-all-users', {
        body: {},
      });

      if (error) throw error;

      toast({
        title: "Siker!",
        description: data.message || "Minden felhasználó törölve",
      });

      // Redirect to login after a delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error: any) {
      console.error('Error deleting users:', error);
      toast({
        title: "Hiba",
        description: error.message || "Nem sikerült törölni a felhasználókat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Összes felhasználó törlése
          </CardTitle>
          <CardDescription>
            Ez a művelet véglegesen törli az összes felhasználót az adatbázisból!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="w-full"
                disabled={loading}
              >
                {loading ? "Törlés folyamatban..." : "Összes felhasználó törlése"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Biztosan törölni szeretnéd?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ez a művelet visszavonhatatlan! Minden felhasználói fiók véglegesen törlődni fog.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Mégse</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAllUsers}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Törlés
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeleteAllUsers;
