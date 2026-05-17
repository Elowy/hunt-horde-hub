-- Fix: "System can create notifications" WITH CHECK (true) bármely bejelentkezett
-- felhasználónak engedélyezte más user_id-re szóló értesítés INSERT-jét.
-- DB-triggerek (SECURITY DEFINER, postgres owner) bypassolják az RLS-t → nem törnek el.
-- Edge function (service_role key) szintén bypass → nem törik el.
-- Közvetlen frontend INSERT a notifications táblába nem létezik.

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "System can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
