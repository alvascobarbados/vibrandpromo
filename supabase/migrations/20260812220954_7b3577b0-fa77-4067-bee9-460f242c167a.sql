ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS contact text;
CREATE UNIQUE INDEX IF NOT EXISTS suppliers_name_key ON public.suppliers (name);