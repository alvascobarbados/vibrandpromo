CREATE TABLE public.user_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_prefs TO authenticated;
GRANT ALL ON public.user_prefs TO service_role;

ALTER TABLE public.user_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own prefs" ON public.user_prefs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own prefs" ON public.user_prefs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own prefs" ON public.user_prefs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_prefs_set_updated_at
  BEFORE UPDATE ON public.user_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();