CREATE TABLE public.origins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.origins TO authenticated;
GRANT ALL ON public.origins TO service_role;

ALTER TABLE public.origins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read origins" ON public.origins
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Staff insert origins" ON public.origins
  FOR INSERT TO authenticated
  WITH CHECK (can_use_page(auth.uid(), 'products') OR can_use_page(auth.uid(), 'categories'));
CREATE POLICY "Staff update origins" ON public.origins
  FOR UPDATE TO authenticated
  USING (can_use_page(auth.uid(), 'products') OR can_use_page(auth.uid(), 'categories'))
  WITH CHECK (can_use_page(auth.uid(), 'products') OR can_use_page(auth.uid(), 'categories'));
CREATE POLICY "Staff delete origins" ON public.origins
  FOR DELETE TO authenticated
  USING (can_use_page(auth.uid(), 'products') OR can_use_page(auth.uid(), 'categories'));

CREATE TRIGGER origins_updated_at BEFORE UPDATE ON public.origins
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO public.origins (code, name, notes) VALUES
  ('BARBADOS', 'Barbados (local)', 'Locally held stock or Barbados-based suppliers'),
  ('CHINA', 'China', ''),
  ('INDIA', 'India', 'Reserved for future India-direct shipments'),
  ('USA_MIAMI', 'USA (Miami)', ''),
  ('USA_NON_MIAMI', 'USA (Non-Miami)', ''),
  ('VIETNAM', 'Vietnam', '')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, notes = EXCLUDED.notes;

ALTER TABLE public.suppliers ADD COLUMN origin_id uuid REFERENCES public.origins(id);

UPDATE public.suppliers s SET origin_id = o.id
FROM public.origins o
WHERE o.code = CASE
  WHEN s.name = 'Casla' THEN 'VIETNAM'
  WHEN s.country ILIKE '%china%' THEN 'CHINA'
  WHEN s.country ILIKE '%india%' THEN 'INDIA'
  WHEN s.country ILIKE '%barbados%' THEN 'BARBADOS'
  WHEN s.country ILIKE '%usa%' OR s.country ILIKE '%united states%' THEN 'USA_NON_MIAMI'
  ELSE NULL
END;

ALTER TABLE public.suppliers DROP COLUMN country;