CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  country text NOT NULL DEFAULT '',
  default_shipping_mode text NOT NULL DEFAULT 'Ocean',
  unit_system text NOT NULL DEFAULT 'metric',
  notes text NOT NULL DEFAULT '',
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT suppliers_code_format CHECK (code ~ '^[A-Z]{3}$'),
  CONSTRAINT suppliers_shipping_mode CHECK (default_shipping_mode IN ('Air','Ocean','Local')),
  CONSTRAINT suppliers_unit_system CHECK (unit_system IN ('metric','imperial'))
);

CREATE UNIQUE INDEX suppliers_name_key ON public.suppliers (lower(name));
CREATE UNIQUE INDEX suppliers_code_key ON public.suppliers (code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read suppliers" ON public.suppliers
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff insert suppliers" ON public.suppliers
  FOR INSERT TO authenticated
  WITH CHECK (can_use_page(auth.uid(), 'products') OR can_use_page(auth.uid(), 'categories'));
CREATE POLICY "Staff update suppliers" ON public.suppliers
  FOR UPDATE TO authenticated
  USING (can_use_page(auth.uid(), 'products') OR can_use_page(auth.uid(), 'categories'))
  WITH CHECK (can_use_page(auth.uid(), 'products') OR can_use_page(auth.uid(), 'categories'));
CREATE POLICY "Staff delete suppliers" ON public.suppliers
  FOR DELETE TO authenticated
  USING (can_use_page(auth.uid(), 'products') OR can_use_page(auth.uid(), 'categories'));

CREATE OR REPLACE FUNCTION public.normalize_supplier_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.code := upper(btrim(NEW.code));
  NEW.name := btrim(NEW.name);
  IF NEW.name = '' THEN
    RAISE EXCEPTION 'Supplier name is required.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER suppliers_normalize BEFORE INSERT OR UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.normalize_supplier_code();

CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sourcing link table. Cost fields (unit cost, currency, moq breaks) will join here next.
CREATE TABLE public.product_sourcing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_item_no text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_sourcing TO authenticated;
GRANT ALL ON public.product_sourcing TO service_role;

ALTER TABLE public.product_sourcing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read product sourcing" ON public.product_sourcing
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff insert product sourcing" ON public.product_sourcing
  FOR INSERT TO authenticated
  WITH CHECK (can_use_page(auth.uid(), 'products') OR can_use_page(auth.uid(), 'import'));
CREATE POLICY "Staff update product sourcing" ON public.product_sourcing
  FOR UPDATE TO authenticated
  USING (can_use_page(auth.uid(), 'products') OR can_use_page(auth.uid(), 'import'))
  WITH CHECK (can_use_page(auth.uid(), 'products') OR can_use_page(auth.uid(), 'import'));
CREATE POLICY "Staff delete product sourcing" ON public.product_sourcing
  FOR DELETE TO authenticated
  USING (can_use_page(auth.uid(), 'products') OR can_use_page(auth.uid(), 'import'));

CREATE TRIGGER product_sourcing_updated_at BEFORE UPDATE ON public.product_sourcing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX product_sourcing_supplier_id_idx ON public.product_sourcing (supplier_id);