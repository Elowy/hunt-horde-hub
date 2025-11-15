import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Vissza
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Adatvédelmi Nyilatkozat</CardTitle>
            <CardDescription>
              Utolsó frissítés: {new Date().toLocaleDateString('hu-HU')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 prose prose-slate max-w-none">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Bevezetés</h2>
              <p>
                Jelen adatvédelmi nyilatkozat célja, hogy tájékoztassa a felhasználókat arról, 
                hogy milyen személyes adatokat kezelünk, milyen célból, meddig, és milyen jogai 
                vannak az adatkezelés során.
              </p>
              <p>
                Adatkezelőként kiemelt figyelmet fordítunk a felhasználók személyes adatainak védelmére, 
                és betartjuk az Általános Adatvédelmi Rendelet (GDPR) előírásait.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. Kezelt Adatok</h2>
              <p>Az alábbi személyes adatokat kezeljük:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Cégnév / Név:</strong> A felhasználó vagy szervezet azonosítására</li>
                <li><strong>E-mail cím:</strong> Kapcsolattartás, értesítések küldése</li>
                <li><strong>Telefonszám:</strong> Kapcsolattartás céljából</li>
                <li><strong>Cím:</strong> Számlázási és szállítási információk</li>
                <li><strong>Adószám:</strong> Számlázási célokra</li>
                <li><strong>Vadászjegy szám:</strong> Jogosultság ellenőrzése</li>
                <li><strong>Születési dátum:</strong> Jogosultság ellenőrzése</li>
                <li><strong>Vadászati adatok:</strong> Állat nyilvántartás, beiratkozások, szállítási dokumentumok</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. Adatkezelés Célja és Jogalapja</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">3.1. Szolgáltatás nyújtása</h3>
                  <p>
                    <strong>Jogalap:</strong> Szerződés teljesítése (GDPR 6. cikk (1) b) pont)
                  </p>
                  <p>
                    A személyes adatok kezelése szükséges a vadászati nyilvántartó rendszer 
                    használatához, a vadászati beiratkozások kezeléséhez és a szállítási 
                    dokumentumok kiállításához.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">3.2. Jogszabályi kötelezettség</h3>
                  <p>
                    <strong>Jogalap:</strong> Jogi kötelezettség teljesítése (GDPR 6. cikk (1) c) pont)
                  </p>
                  <p>
                    Bizonyos adatok kezelése jogszabályi kötelezettségből ered 
                    (pl. számlázási adatok megőrzése).
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">3.3. Jogos érdek</h3>
                  <p>
                    <strong>Jogalap:</strong> Jogos érdek (GDPR 6. cikk (1) f) pont)
                  </p>
                  <p>
                    Technikai naplók kezelése a rendszer biztonságának és stabilitásának 
                    fenntartása érdekében.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Adatkezelés Időtartama</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Felhasználói fiók adatok:</strong> A fiók törlésig vagy 5 év inaktivitás után</li>
                <li><strong>Számlázási adatok:</strong> 8 év (jogszabályi kötelezettség)</li>
                <li><strong>Vadászati nyilvántartások:</strong> Jogszabályi előírások szerint</li>
                <li><strong>Technikai naplók:</strong> Maximum 90 nap</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Adattovábbítás</h2>
              <p>
                Személyes adatokat harmadik félnek csak az alábbi esetekben továbbítunk:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Jogi kötelezettség teljesítése érdekében (pl. hatósági megkeresés)</li>
                <li>Technikai szolgáltatók részére a szolgáltatás működtetéséhez szükséges mértékben</li>
                <li>Az Ön kifejezett hozzájárulása esetén</li>
              </ul>
              <p className="mt-4">
                <strong>Használt szolgáltatók:</strong> Supabase (adatbázis és autentikáció), 
                Resend (e-mail küldés). Minden szolgáltató GDPR-kompatibilis.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Az Ön Jogai</h2>
              <p>Az adatkezeléssel kapcsolatban az alábbi jogokkal rendelkezik:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Hozzáférés joga:</strong> Tájékoztatást kérhet a kezelt adatairól</li>
                <li><strong>Helyesbítés joga:</strong> Kérheti helytelen adatai javítását</li>
                <li><strong>Törlés joga:</strong> Kérheti adatai törlését (kivéve jogszabályi kötelezettség esetén)</li>
                <li><strong>Korlátozás joga:</strong> Kérheti adatkezelés korlátozását</li>
                <li><strong>Tiltakozás joga:</strong> Tiltakozhat az adatkezelés ellen</li>
                <li><strong>Adathordozhatóság joga:</strong> Kérheti adatai géppel olvasható formátumban</li>
                <li><strong>Hozzájárulás visszavonása:</strong> Bármikor visszavonhatja hozzájárulását</li>
              </ul>
              <p className="mt-4">
                <strong>Fiók törlése:</strong> Fiókját bármikor törölheti a Profil oldalon található 
                "Fiók törlése" gombbal. A törlés végleges és visszafordíthatatlan.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Adatbiztonság</h2>
              <p>
                Technikai és szervezési intézkedéseket alkalmazunk az adatok védelme érdekében:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Titkosított adatátvitel (HTTPS/SSL)</li>
                <li>Titkosított adattárolás</li>
                <li>Hozzáférés-korlátozás és jogosultságkezelés</li>
                <li>Rendszeres biztonsági mentések</li>
                <li>Biztonságos jelszótárolás (hash)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Cookie-k Használata</h2>
              <p>
                A rendszer működéséhez szükséges cookie-kat használunk (munkamenet kezelés, 
                bejelentkezés fenntartása). Ezek nélkül a szolgáltatás nem működne megfelelően.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Módosítások</h2>
              <p>
                Fenntartjuk a jogot, hogy jelen adatvédelmi nyilatkozatot bármikor módosítsuk. 
                A módosításokról e-mailben értesítjük a felhasználókat.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Kapcsolat</h2>
              <p>
                Adatvédelmi kérdésekkel kapcsolatban kérjük, vegye fel velünk a kapcsolatot 
                a profiljában megadott elérhetőségeken keresztül.
              </p>
              <p className="mt-4">
                Panasszal a Nemzeti Adatvédelmi és Információszabadság Hatósághoz (NAIH) 
                fordulhat:
              </p>
              <div className="bg-muted p-4 rounded-lg mt-2">
                <p><strong>Nemzeti Adatvédelmi és Információszabadság Hatóság</strong></p>
                <p>Cím: 1055 Budapest, Falk Miksa utca 9-11.</p>
                <p>Telefon: +36 1 391 1400</p>
                <p>E-mail: ugyfelszolgalat@naih.hu</p>
                <p>Weboldal: www.naih.hu</p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
