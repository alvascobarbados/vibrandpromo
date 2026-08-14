-- 1a. Decoration master data
CREATE TABLE public.decoration_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  sub_rule_type text NOT NULL CHECK (sub_rule_type IN ('A','B','C')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX decoration_methods_code_upper_uq ON public.decoration_methods (UPPER(code));

CREATE TABLE public.method_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decoration_method_id uuid NOT NULL REFERENCES public.decoration_methods(id) ON DELETE CASCADE,
  code text NOT NULL,
  detail text NOT NULL,
  n_setup integer NOT NULL DEFAULT 0,
  n_run integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX method_details_code_upper_uq ON public.method_details (UPPER(code));
CREATE INDEX method_details_method_idx ON public.method_details (decoration_method_id);

-- 1b. Product pricing structures
CREATE TABLE public.product_decorations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  method_detail_id uuid NOT NULL REFERENCES public.method_details(id),
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, method_detail_id)
);
CREATE INDEX product_decorations_product_idx ON public.product_decorations (product_id);
CREATE INDEX product_decorations_detail_idx ON public.product_decorations (method_detail_id);

CREATE TABLE public.product_decoration_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_decoration_id uuid NOT NULL REFERENCES public.product_decorations(id) ON DELETE CASCADE,
  qty integer NOT NULL CHECK (qty > 0),
  unit_cost numeric NOT NULL CHECK (unit_cost >= 0),
  setup_cost numeric NOT NULL DEFAULT 0 CHECK (setup_cost >= 0),
  inland_freight_usd numeric CHECK (inland_freight_usd IS NULL OR inland_freight_usd >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_decoration_id, qty)
);
CREATE INDEX product_decoration_bands_decoration_idx ON public.product_decoration_bands (product_decoration_id);

-- 1c. Extend product_sourcing
ALTER TABLE public.product_sourcing
  ADD COLUMN supplier_item_name text,
  ADD COLUMN variant_label text,
  ADD COLUMN carton_pack integer CHECK (carton_pack IS NULL OR carton_pack > 0),
  ADD COLUMN carton_length numeric CHECK (carton_length IS NULL OR carton_length > 0),
  ADD COLUMN carton_width numeric CHECK (carton_width IS NULL OR carton_width > 0),
  ADD COLUMN carton_height numeric CHECK (carton_height IS NULL OR carton_height > 0),
  ADD COLUMN carton_weight numeric CHECK (carton_weight IS NULL OR carton_weight > 0);

-- 1d. Grants, RLS, policies, triggers (product_sourcing pattern: staff-only)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decoration_methods TO authenticated;
GRANT ALL ON public.decoration_methods TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.method_details TO authenticated;
GRANT ALL ON public.method_details TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_decorations TO authenticated;
GRANT ALL ON public.product_decorations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_decoration_bands TO authenticated;
GRANT ALL ON public.product_decoration_bands TO service_role;

ALTER TABLE public.decoration_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.method_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_decorations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_decoration_bands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view decoration methods" ON public.decoration_methods FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert decoration methods" ON public.decoration_methods FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update decoration methods" ON public.decoration_methods FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete decoration methods" ON public.decoration_methods FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can view method details" ON public.method_details FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert method details" ON public.method_details FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update method details" ON public.method_details FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete method details" ON public.method_details FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can view product decorations" ON public.product_decorations FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert product decorations" ON public.product_decorations FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update product decorations" ON public.product_decorations FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete product decorations" ON public.product_decorations FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can view decoration bands" ON public.product_decoration_bands FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert decoration bands" ON public.product_decoration_bands FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update decoration bands" ON public.product_decoration_bands FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can delete decoration bands" ON public.product_decoration_bands FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TRIGGER decoration_methods_updated_at BEFORE UPDATE ON public.decoration_methods FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER method_details_updated_at BEFORE UPDATE ON public.method_details FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER product_decorations_updated_at BEFORE UPDATE ON public.product_decorations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER product_decoration_bands_updated_at BEFORE UPDATE ON public.product_decoration_bands FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed methods
INSERT INTO public.decoration_methods (code, name, sub_rule_type, notes) VALUES
  ('SUB','Full Colour Dye Sublimation','A',NULL),
  ('HT','Heat Transfer Print','A',NULL),
  ('UV','UV Printing','A',NULL),
  ('DIG','Digital Printing','A',NULL),
  ('DEB','Deboss','A',NULL),
  ('EMB','Emboss','A',NULL),
  ('DSM','Die Struck Moulding','A',NULL),
  ('DOM','3D Doming','A',NULL),
  ('INJ','Injection Moulding','A',NULL),
  ('LZR','Laser Engraving','B',NULL),
  ('FS','Foil Stamping','B',NULL),
  ('EM','Embroidery','B',NULL),
  ('EM3D','3D Embroidery','B',NULL),
  ('SP','Screen Print','C',NULL),
  ('PP','Pad Print','C',NULL),
  ('OFF','Offset Printing','C',NULL),
  ('NODECO','No Decoration','A','System method: zero-cost bypass');

-- Seed details: one per type-A method
INSERT INTO public.method_details (decoration_method_id, code, detail, n_setup, n_run)
SELECT id, code, CASE WHEN code = 'NODECO' THEN 'No decoration' ELSE name END, 0, 0
FROM public.decoration_methods WHERE sub_rule_type = 'A';

INSERT INTO public.method_details (decoration_method_id, code, detail, n_setup, n_run)
SELECT m.id, v.code, v.detail, v.n_setup, v.n_run
FROM (VALUES
  ('SP','SP-1C1P','1 colour, 1 position',1,0),
  ('SP','SP-2C1P','2 colours, 1 position',2,1),
  ('SP','SP-3C1P','3 colours, 1 position',3,2),
  ('SP','SP-4C1P','4 colours, 1 position',4,3),
  ('SP','SP-FC1P','Full colour, 1 position',4,3),
  ('PP','PP-1C1P','1 colour, 1 position',1,0),
  ('PP','PP-2C1P','2 colours, 1 position',2,1),
  ('PP','PP-3C1P','3 colours, 1 position',3,2),
  ('PP','PP-4C1P','4 colours, 1 position',4,3),
  ('PP','PP-FC1P','Full colour, 1 position',4,3),
  ('OFF','OFF-1C','1 colour',1,0),
  ('OFF','OFF-2C','2 colours',2,1),
  ('OFF','OFF-3C','3 colours',3,2),
  ('OFF','OFF-4C','4 colours',4,3),
  ('OFF','OFF-FC','Full colour',4,3),
  ('LZR','LZR-1P','1 position',1,0),
  ('LZR','LZR-AO','All over',1,0),
  ('EM','EM-SM','Small',1,0),
  ('EM','EM-MD','Medium',1,0),
  ('EM','EM-LG','Large',1,0),
  ('EM','EM-XL','Extra Large',1,0),
  ('EM3D','EM3D-SM','Small',1,0),
  ('EM3D','EM3D-MD','Medium',1,0),
  ('EM3D','EM3D-LG','Large',1,0),
  ('EM3D','EM3D-XL','Extra Large',1,0),
  ('FS','FS-GLD','Gold foil',1,0),
  ('FS','FS-SLV','Silver foil',1,0)
) AS v(method_code, code, detail, n_setup, n_run)
JOIN public.decoration_methods m ON m.code = v.method_code;

-- 1e. Public decoration projection: products.decoration_methods becomes derived
CREATE OR REPLACE FUNCTION public.sync_product_decoration_projection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid;
  names text[];
BEGIN
  target := COALESCE(NEW.product_id, OLD.product_id);
  SELECT COALESCE(array_agg(name ORDER BY min_sort, name), '{}'::text[])
    INTO names
  FROM (
    SELECT dm.name AS name, MIN(pd.sort_order) AS min_sort
    FROM public.product_decorations pd
    JOIN public.method_details md ON md.id = pd.method_detail_id
    JOIN public.decoration_methods dm ON dm.id = md.decoration_method_id
    WHERE pd.product_id = target AND dm.code <> 'NODECO'
    GROUP BY dm.name
  ) grouped;

  IF EXISTS (SELECT 1 FROM public.product_decorations WHERE product_id = target) THEN
    UPDATE public.products SET decoration_methods = names WHERE id = target;
  ELSE
    UPDATE public.products SET decoration_methods = '{}'::text[] WHERE id = target;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER product_decorations_sync_projection
AFTER INSERT OR UPDATE OR DELETE ON public.product_decorations
FOR EACH ROW EXECUTE FUNCTION public.sync_product_decoration_projection();