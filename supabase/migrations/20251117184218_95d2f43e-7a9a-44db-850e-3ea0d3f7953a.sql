-- Create table for storing user login history with IP addresses
CREATE TABLE IF NOT EXISTS public.user_login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_login_history ENABLE ROW LEVEL SECURITY;

-- Super admins can view all login history
CREATE POLICY "Super admins can view all login history"
ON public.user_login_history
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- System can insert login history
CREATE POLICY "System can insert login history"
ON public.user_login_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_login_history_user_id ON public.user_login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_history_created_at ON public.user_login_history(created_at DESC);