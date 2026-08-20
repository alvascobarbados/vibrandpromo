CREATE TABLE public.buyers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX buyers_client_id_idx ON public.buyers (client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyers TO authenticated;
GRANT ALL ON public.buyers TO service_role;

ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view buyers" ON public.buyers
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can add buyers" ON public.buyers
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update buyers" ON public.buyers
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete buyers" ON public.buyers
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER buyers_updated_at BEFORE UPDATE ON public.buyers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.proposals
  ADD COLUMN buyer_id uuid REFERENCES public.buyers(id) ON DELETE SET NULL;