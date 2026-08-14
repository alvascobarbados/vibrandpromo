CREATE TABLE public.product_includes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  description text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_includes_product_id_idx ON public.product_includes(product_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_includes TO authenticated;
GRANT ALL ON public.product_includes TO service_role;

ALTER TABLE public.product_includes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read product includes"
  ON public.product_includes FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff insert product includes"
  ON public.product_includes FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update product includes"
  ON public.product_includes FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete product includes"
  ON public.product_includes FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER product_includes_updated_at
  BEFORE UPDATE ON public.product_includes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();