DROP TRIGGER IF EXISTS products_validate_lead_times ON public.products;
DROP FUNCTION IF EXISTS public.validate_product_lead_times();

ALTER TABLE public.products
  DROP COLUMN IF EXISTS air_lead_min,
  DROP COLUMN IF EXISTS air_lead_max,
  DROP COLUMN IF EXISTS sea_lead_min,
  DROP COLUMN IF EXISTS sea_lead_max;

CREATE TABLE public.shipping_settings (
  source text PRIMARY KEY,
  air_min_days integer NOT NULL DEFAULT 0,
  air_max_days integer NOT NULL DEFAULT 0,
  sea_min_weeks integer NOT NULL DEFAULT 0,
  sea_max_weeks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shipping_settings TO anon;
GRANT SELECT ON public.shipping_settings TO authenticated;
GRANT ALL ON public.shipping_settings TO service_role;

ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shipping settings are public" ON public.shipping_settings
  FOR SELECT USING (true);

CREATE TRIGGER shipping_settings_updated_at
  BEFORE UPDATE ON public.shipping_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.shipping_settings (source, air_min_days, air_max_days, sea_min_weeks, sea_max_weeks)
VALUES
  ('Factory Direct', 3, 7, 8, 12),
  ('USA Inventory', 2, 5, 3, 4);