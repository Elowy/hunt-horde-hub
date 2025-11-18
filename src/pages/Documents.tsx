import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Upload, FileText, Download, Trash2, Crown } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

interface Document {
  id: string;
  name: string;
  created_at: string;
  metadata: {
    size: number;
    mimetype: string;
  };
}

const Documents = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPro, loading: subscriptionLoading } = useSubscription();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", user.id)
        .single();

      if (!profile || profile.user_type !== "hunter_society") {
        toast({
          title: "Hozzáférés megtagadva",
          description: "Csak vadásztársaságok férhetnek hozzá a dokumentumokhoz",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setUserType(profile.user_type);
      await loadDocuments();
    } catch (error) {
      console.error("Error checking access:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.storage
        .from("documents")
        .list(user.id, {
          limit: 100,
          offset: 0,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) throw error;

      const documentsWithMetadata = data.map(file => ({
        id: file.id,
        name: file.name,
        created_at: file.created_at,
        metadata: file.metadata as { size: number; mimetype: string },
      }));

      setDocuments(documentsWithMetadata);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a dokumentumokat",
        variant: "destructive",
      });
    }
  };

  const validateFile = (file: File): string | null => {
    const MAX_SIZE = 2.5 * 1024 * 1024; // 2.5 MB
    const ALLOWED_TYPES = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
    ];
    const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];

    // Check file size
    if (file.size > MAX_SIZE) {
      return "A fájl mérete nem lehet nagyobb mint 2.5 MB";
    }

    // Check MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Csak PDF, DOC, DOCX, JPG és PNG fájlok tölthetők fel";
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    if (!hasValidExtension) {
      return "Érvénytelen fájlkiterjesztés";
    }

    return null;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: "Érvénytelen fájl",
        description: validationError,
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      toast({
        title: "Sikeres feltöltés",
        description: `${file.name} sikeresen feltöltve`,
      });

      await loadDocuments();
      event.target.value = "";
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Feltöltési hiba",
        description: error instanceof Error ? error.message : "Nem sikerült feltölteni a fájlt",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.storage
        .from("documents")
        .download(`${user.id}/${fileName}`);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Letöltési hiba",
        description: "Nem sikerült letölteni a fájlt",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Biztosan törli ezt a dokumentumot: ${fileName}?`)) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.storage
        .from("documents")
        .remove([`${user.id}/${fileName}`]);

      if (error) throw error;

      toast({
        title: "Sikeres törlés",
        description: `${fileName} törölve`,
      });

      await loadDocuments();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Törlési hiba",
        description: "Nem sikerült törölni a fájlt",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Betöltés...</p>
        </div>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted">
        <PageHeader onLogout={handleLogout} />
        <div className="container mx-auto px-6 py-8">
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <Crown className="h-4 w-4" />
            <AlertDescription>
              A dokumentum kezelő funkció csak Pro előfizetéssel érhető el.
              <Button
                variant="link"
                className="pl-1"
                onClick={() => navigate("/subscriptions")}
              >
                Váltson Pro verzióra
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <PageHeader onLogout={handleLogout} />
      
      <div className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dokumentumok</h1>
            <p className="text-muted-foreground mt-2">
              Töltse fel és kezelje a vadásztársaság dokumentumait
            </p>
          </div>

          {/* Feltöltés */}
          <Card>
            <CardHeader>
              <CardTitle>Új dokumentum feltöltése</CardTitle>
              <CardDescription>
                Maximum 2.5 MB méretű PDF, DOC, DOCX, JPG vagy PNG fájlok tölthetők fel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Biztonsági figyelmeztetés:</strong> Ne töltsön fel bizalmas információkat tartalmazó fájlokat ismeretlen forrásból.
                    A rendszer csak a megadott fájltípusokat és méreteket fogadja el.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="file-upload">Válasszon fájlt</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </div>

                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span>Feltöltés folyamatban...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dokumentumok listája */}
          <Card>
            <CardHeader>
              <CardTitle>Feltöltött dokumentumok</CardTitle>
              <CardDescription>
                {documents.length} dokumentum
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Még nincsenek feltöltött dokumentumok</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fájlnév</TableHead>
                        <TableHead>Méret</TableHead>
                        <TableHead>Feltöltés dátuma</TableHead>
                        <TableHead className="text-right">Műveletek</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              {doc.name}
                            </div>
                          </TableCell>
                          <TableCell>{formatFileSize(doc.metadata?.size || 0)}</TableCell>
                          <TableCell>
                            {format(new Date(doc.created_at), "yyyy. MM. dd. HH:mm", {
                              locale: hu,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(doc.name)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(doc.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Documents;
