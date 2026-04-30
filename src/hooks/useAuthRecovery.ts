import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Globálisan kezeli a stale / érvénytelen Supabase session tokent.
 *
 * - Indulás után megpróbálja lekérni az aktuális sessiont. Ha a refresh token
 *   szerver oldalon érvénytelen ("refresh_token_not_found"), akkor csendben
 *   kijelentkezteti a felhasználót lokálisan, hogy a localStorage-ben tárolt
 *   stale tokent kitisztítsa, és ne dobjon minden oldalbetöltéskor hibát a
 *   konzolba.
 * - `TOKEN_REFRESHED` esemény hiányában (signed_out) szintén garantálja a
 *   tisztítást.
 */
export const useAuthRecovery = () => {
  useEffect(() => {
    let isMounted = true;

    const recover = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        const isInvalidRefreshToken =
          (error as any)?.code === "refresh_token_not_found" ||
          /refresh token/i.test(error?.message ?? "");

        if (isInvalidRefreshToken || (error && !data?.session)) {
          // Stale local state — clean it up locally without calling the server.
          await supabase.auth.signOut({ scope: "local" });
        }
      } catch (err) {
        // Last-resort cleanup: clear anything that looks like a Supabase
        // auth token from localStorage so the next load is clean.
        try {
          Object.keys(localStorage)
            .filter((k) => k.startsWith("sb-") && k.includes("-auth-token"))
            .forEach((k) => localStorage.removeItem(k));
        } catch {
          /* ignore */
        }
      }
    };

    recover();

    return () => {
      isMounted = false;
    };
  }, []);
};
