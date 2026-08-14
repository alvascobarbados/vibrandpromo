-- ═══ TASK 1: costing schema ported from V3-1 (structure mirrored, Vibrand staff-only RLS) ═══

-- ── shipping_methods (transport costing; NOT the customer shipping_settings/products.shipping_methods system) ──
CREATE TABLE public.shipping_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  notes text,
  fuel_surcharge_pct numeric NOT NULL DEFAULT 0,
  buffer_pct numeric NOT NULL DEFAULT 0,
  chargeable_metric text NOT NULL DEFAULT 'CHARGEABLE_WEIGHT',
  chargeable_unit text NOT NULL DEFAULT 'lbs',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shipping_methods_chargeable_metric_chk
    CHECK (chargeable_metric IN ('ACTUAL_WEIGHT','VOLUMETRIC_WEIGHT','CHARGEABLE_WEIGHT','VOLUME'))
);
CREATE UNIQUE INDEX shipping_methods_code_upper_uq ON public.shipping_methods (UPPER(code));
REVOKE ALL ON public.shipping_methods FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_methods TO authenticated;
GRANT ALL ON public.shipping_methods TO service_role;
ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read shipping methods" ON public.shipping_methods FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff insert shipping methods" ON public.shipping_methods FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff update shipping methods" ON public.shipping_methods FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff delete shipping methods" ON public.shipping_methods FOR DELETE TO authenticated USING (is_staff(auth.uid()));
CREATE TRIGGER shipping_methods_updated_at BEFORE UPDATE ON public.shipping_methods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── destinations ──
CREATE TABLE public.destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX destinations_code_upper_uq ON public.destinations (UPPER(code));
REVOKE ALL ON public.destinations FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.destinations TO authenticated;
GRANT ALL ON public.destinations TO service_role;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read destinations" ON public.destinations FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff insert destinations" ON public.destinations FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff update destinations" ON public.destinations FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff delete destinations" ON public.destinations FOR DELETE TO authenticated USING (is_staff(auth.uid()));
CREATE TRIGGER destinations_updated_at BEFORE UPDATE ON public.destinations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── shipping_method_routes (method × origin × destination) ──
CREATE TABLE public.shipping_method_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipping_method_id uuid NOT NULL REFERENCES public.shipping_methods(id) ON DELETE CASCADE,
  origin_id uuid NOT NULL REFERENCES public.origins(id) ON DELETE RESTRICT,
  destination_id uuid NOT NULL REFERENCES public.destinations(id) ON DELETE RESTRICT,
  fixed_cost numeric NOT NULL DEFAULT 0,
  lac_fixed_bbd numeric NOT NULL DEFAULT 0,
  lac_per_cbm_bbd numeric NOT NULL DEFAULT 0,
  include_inland_freight boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shipping_method_id, origin_id, destination_id)
);
CREATE INDEX idx_shipping_method_routes_method ON public.shipping_method_routes(shipping_method_id);
CREATE INDEX idx_shipping_method_routes_origin ON public.shipping_method_routes(origin_id);
CREATE INDEX idx_shipping_method_routes_destination ON public.shipping_method_routes(destination_id);
REVOKE ALL ON public.shipping_method_routes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_method_routes TO authenticated;
GRANT ALL ON public.shipping_method_routes TO service_role;
ALTER TABLE public.shipping_method_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read shipping routes" ON public.shipping_method_routes FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff insert shipping routes" ON public.shipping_method_routes FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff update shipping routes" ON public.shipping_method_routes FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff delete shipping routes" ON public.shipping_method_routes FOR DELETE TO authenticated USING (is_staff(auth.uid()));
CREATE TRIGGER shipping_method_routes_updated_at BEFORE UPDATE ON public.shipping_method_routes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── shipping_method_tiers (per-route bands) ──
CREATE TABLE public.shipping_method_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.shipping_method_routes(id) ON DELETE CASCADE,
  band_from numeric NOT NULL DEFAULT 0,
  band_to numeric,
  rate numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shipping_method_tiers_route ON public.shipping_method_tiers(route_id);
REVOKE ALL ON public.shipping_method_tiers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_method_tiers TO authenticated;
GRANT ALL ON public.shipping_method_tiers TO service_role;
ALTER TABLE public.shipping_method_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read shipping tiers" ON public.shipping_method_tiers FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff insert shipping tiers" ON public.shipping_method_tiers FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff update shipping tiers" ON public.shipping_method_tiers FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff delete shipping tiers" ON public.shipping_method_tiers FOR DELETE TO authenticated USING (is_staff(auth.uid()));
CREATE TRIGGER shipping_method_tiers_updated_at BEFORE UPDATE ON public.shipping_method_tiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── rounding_rules ──
CREATE TABLE public.rounding_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_min numeric NOT NULL,
  band_max numeric,
  round_up_to numeric NOT NULL,
  description text,
  display_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.rounding_rules FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rounding_rules TO authenticated;
GRANT ALL ON public.rounding_rules TO service_role;
ALTER TABLE public.rounding_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read rounding rules" ON public.rounding_rules FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff insert rounding rules" ON public.rounding_rules FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff update rounding rules" ON public.rounding_rules FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff delete rounding rules" ON public.rounding_rules FOR DELETE TO authenticated USING (is_staff(auth.uid()));
CREATE TRIGGER rounding_rules_updated_at BEFORE UPDATE ON public.rounding_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── app_settings ──
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  key text NOT NULL,
  value text,
  value_type text NOT NULL DEFAULT 'text',
  display_label text,
  display_order integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section, key)
);
REVOKE ALL ON public.app_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read app settings" ON public.app_settings FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff insert app settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff update app settings" ON public.app_settings FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff delete app settings" ON public.app_settings FOR DELETE TO authenticated USING (is_staff(auth.uid()));
CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── detail_labels ──
CREATE TABLE public.detail_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX detail_labels_label_unique ON public.detail_labels (UPPER(label));
REVOKE ALL ON public.detail_labels FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.detail_labels TO authenticated;
GRANT ALL ON public.detail_labels TO service_role;
ALTER TABLE public.detail_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read detail labels" ON public.detail_labels FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff insert detail labels" ON public.detail_labels FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff update detail labels" ON public.detail_labels FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff delete detail labels" ON public.detail_labels FOR DELETE TO authenticated USING (is_staff(auth.uid()));
CREATE TRIGGER detail_labels_updated_at BEFORE UPDATE ON public.detail_labels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── product_details (per-product attribute values; imported later by SKU pass) ──
CREATE TABLE public.product_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  detail_label_id uuid NOT NULL REFERENCES public.detail_labels(id) ON DELETE RESTRICT,
  value text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX product_details_unique ON public.product_details (product_id, detail_label_id);
CREATE INDEX idx_product_details_product ON public.product_details (product_id);
CREATE INDEX idx_product_details_label ON public.product_details (detail_label_id);
REVOKE ALL ON public.product_details FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_details TO authenticated;
GRANT ALL ON public.product_details TO service_role;
ALTER TABLE public.product_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read product details" ON public.product_details FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff insert product details" ON public.product_details FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff update product details" ON public.product_details FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff delete product details" ON public.product_details FOR DELETE TO authenticated USING (is_staff(auth.uid()));
CREATE TRIGGER product_details_updated_at BEFORE UPDATE ON public.product_details
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── duty rate placement mirrored from V3-1 (product_categories.duty_rate_pct); left empty ──
ALTER TABLE public.categories ADD COLUMN duty_rate_pct numeric;
ALTER TABLE public.subcategories ADD COLUMN duty_rate_pct numeric;