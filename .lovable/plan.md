

## **Megoldási terv**

### **1. Tagdíj bevételek integrálása a balance rendszerbe**

**Fájl**: Új database trigger vagy edge function

**Cél**: Amikor egy tagdíjat befizetnek (`membership_payments.paid = true`), automatikusan:
- Hozzunk létre vagy frissítsünk egy `user_balances` rekordot
- Adjunk hozzá egy tranzakciót a `user_balance_transactions` táblához
- A balance **növekedjen** a tagdíj összegével (pozitív tétel)

**Implementáció**:
```sql
-- Database trigger a membership_payments táblán
CREATE OR REPLACE FUNCTION handle_membership_payment_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Ha befizetésre került (paid = true) és előtte nem volt befizetve
  IF NEW.paid = TRUE AND (OLD.paid = FALSE OR OLD.paid IS NULL) THEN
    
    -- Frissítsük vagy hozzunk létre user_balances rekordot
    INSERT INTO user_balances (user_id, hunter_society_id, current_balance, last_transaction_at)
    VALUES (NEW.user_id, NEW.hunter_society_id, NEW.amount, NOW())
    ON CONFLICT (user_id, hunter_society_id) 
    DO UPDATE SET 
      current_balance = user_balances.current_balance + NEW.amount,
      last_transaction_at = NOW();
    
    -- Adjunk hozzá tranzakciót
    INSERT INTO user_balance_transactions (
      user_id, 
      hunter_society_id, 
      transaction_type, 
      amount, 
      description,
      related_entity_type,
      related_entity_id
    ) VALUES (
      NEW.user_id,
      NEW.hunter_society_id,
      'membership_fee',
      NEW.amount,
      'Tagdíj befizetés: ' || NEW.season_year || ' - ' || NEW.period,
      'membership_payment',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger létrehozása
CREATE TRIGGER membership_payment_balance_trigger
AFTER UPDATE ON membership_payments
FOR EACH ROW
EXECUTE FUNCTION handle_membership_payment_update();
```

**Migráció**: Meglévő tagdíjak visszamenőleges feldolgozása:
```sql
-- Feldolgozzuk az összes már befizetett tagdíjat
INSERT INTO user_balance_transactions (
  user_id, 
  hunter_society_id, 
  transaction_type, 
  amount, 
  description,
  related_entity_type,
  related_entity_id,
  created_at
)
SELECT 
  user_id,
  hunter_society_id,
  'membership_fee',
  amount,
  'Tagdíj befizetés: ' || season_year || ' - ' || period,
  'membership_payment',
  id,
  paid_at
FROM membership_payments
WHERE paid = TRUE
ORDER BY paid_at;

-- Számítsuk ki az egyenlegeket
INSERT INTO user_balances (user_id, hunter_society_id, current_balance, last_transaction_at)
SELECT 
  user_id,
  hunter_society_id,
  SUM(amount) as total_balance,
  MAX(paid_at) as last_transaction
FROM membership_payments
WHERE paid = TRUE
GROUP BY user_id, hunter_society_id
ON CONFLICT (user_id, hunter_society_id) 
DO UPDATE SET 
  current_balance = EXCLUDED.current_balance,
  last_transaction_at = EXCLUDED.last_transaction_at;
```

---

### **2. "Bevételek" menüpont hozzáadása adminoknak**

**Fájl**: `src/components/DashboardMenu.tsx`

**Változtatás**: A "Tagdíjak" szekció után (line 621 után) adjunk hozzá egy új "Bevételek" szekciót:

```typescript
{/* Bevételek - csak admin/editor számára */}
{(isAdmin || isEditor) && !isBuyer && (
  <>
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground px-2">Bevételek</p>
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => handleNavigation("/balance-transactions")}
      >
        <DollarSign className="mr-2 h-4 w-4" />
        Egyenleg kezelés
      </Button>
    </div>
    <Separator />
  </>
)}
```

**Új oldal létrehozása**: `src/pages/BalanceTransactions.tsx`
- Megjelenít minden tranzakciót táblázatos formában
- Szűrés vadász/társaság/típus szerint
- Export funkció (Excel/PDF)
- Összegző kártyák (összesen beérkezett, kiadott, egyenleg)

---

### **3. Beiratkozás Pro ellenőrzés javítása**

**Fájl**: `src/pages/HuntingRegistrations.tsx`

**Probléma lokalizálása**:
- Line 159: `const { isPro, loading: subscriptionLoading } = useSubscription();`
- Ez a **saját felhasználó** Pro státuszát nézi!

**Megoldás**: Hozzunk létre egy `societyIsPro` változót, ami a vadásztársaság előfizetését ellenőrzi:

```typescript
// Line 159 után
const [societyIsPro, setSocietyIsPro] = useState(false);

// checkUserRole függvényben (line 229 után)
useEffect(() => {
  checkSocietySubscription();
}, []);

const checkSocietySubscription = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Vadász esetén ellenőrizzük a társaság előfizetését
  if (isHunter && !isAdmin && !isEditor) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("hunter_society_id")
      .eq("id", user.id)
      .single();

    if (profile?.hunter_society_id) {
      // Trial subscription check
      const { data: trialData } = await supabase
        .from("trial_subscriptions")
        .select("expires_at")
        .eq("user_id", profile.hunter_society_id)
        .maybeSingle();

      if (trialData && new Date(trialData.expires_at) > new Date()) {
        setSocietyIsPro(true);
        return;
      }

      // Lifetime subscription check
      const { data: lifetimeData } = await supabase
        .from("lifetime_subscriptions")
        .select("tier")
        .eq("user_id", profile.hunter_society_id)
        .maybeSingle();

      if (lifetimeData?.tier === "pro") {
        setSocietyIsPro(true);
        return;
      }
    }
  }
  setSocietyIsPro(false);
};
```

**Line 853 javítása**:
```typescript
// ELŐTTE:
if (!isPro) {

// UTÁNA:
const hasAccess = isPro || (isHunter && !isAdmin && !isEditor && societyIsPro);
if (!hasAccess) {
```

---

### **4. Statisztikák jogosultság javítása vadászok számára**

**Fájl**: `src/pages/HunterStatistics.tsx`

**Változtatások a `checkAccess` függvényben** (lines 45-94):

```typescript
const checkAccess = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    // Ellenőrizzük a szerepeket
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roleList = roles?.map(r => r.role) || [];
    const hasAdminAccess = roleList.includes("admin");
    const hasEditorAccess = roleList.includes("editor");
    const isHunterRole = roleList.includes("hunter");

    setIsAdmin(hasAdminAccess);
    setIsEditor(hasEditorAccess);

    // Admin/editor mindig hozzáfér
    if (hasAdminAccess || hasEditorAccess) {
      fetchHunterStatistics();
      return;
    }

    // Vadász esetén ellenőrizzük a jogosultságokat
    if (isHunterRole) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("hunter_category, hunter_society_id")
        .eq("id", user.id)
        .single();

      if (profile?.hunter_category && profile?.hunter_society_id) {
        const { data: permissions } = await supabase
          .from("hunter_feature_permissions")
          .select("allow_view_statistics")
          .eq("hunter_society_id", profile.hunter_society_id)
          .eq("hunter_category", profile.hunter_category)
          .maybeSingle();

        // Ha engedélyezve van a statisztikák megtekintése
        if (permissions?.allow_view_statistics) {
          fetchHunterStatistics();
          return;
        }
      }
    }

    // Ha nincs hozzáférés
    toast({
      title: "Hozzáférés megtagadva",
      description: "Nem rendelkezel jogosultsággal a statisztikák megtekintéséhez.",
      variant: "destructive",
    });
    navigate("/hunter-dashboard");
  } catch (error: any) {
    toast({
      title: "Hiba",
      description: error.message,
      variant: "destructive",
    });
    navigate("/dashboard");
  }
};
```

---

## **Összefoglalás**

### ✅ **1. Tagdíj bevételek**
- Database trigger automatikusan frissíti a `user_balances` táblát
- Visszamenőleges migráció feldolgozza a meglévő tagdíjakat
- Tranzakciók rögzítése a `user_balance_transactions` táblában

### ✅ **2. Bevételek menüpont**
- Új menüpont a `DashboardMenu.tsx`-ben
- Új oldal (`BalanceTransactions.tsx`) a részletes nézetre
- Táblázatos megjelenítés + export funkció

### ✅ **3. Beiratkozás Pro ellenőrzés**
- `societyIsPro` változó bevezetése
- Vadásztársaság előfizetésének helyes ellenőrzése
- Vadászok hozzáférnek, ha társaságuk Pro előfizetéssel rendelkezik

### ✅ **4. Statisztikák jogosultság**
- Vadászok jogosultságát a `hunter_feature_permissions` táblából olvassuk
- Ha `allow_view_statistics = true`, hozzáférnek
- Admin/editor mindig hozzáfér

