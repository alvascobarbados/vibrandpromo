ALTER TABLE public.products
  ALTER COLUMN moq DROP NOT NULL,
  ALTER COLUMN moq DROP DEFAULT,
  ALTER COLUMN production_days DROP NOT NULL,
  ALTER COLUMN production_days DROP DEFAULT,
  ALTER COLUMN colour_option DROP NOT NULL,
  ALTER COLUMN colour_option DROP DEFAULT,
  ADD COLUMN IF NOT EXISTS size text,
  ADD COLUMN IF NOT EXISTS capacity text,
  ADD COLUMN IF NOT EXISTS weight text,
  ADD COLUMN IF NOT EXISTS features text;

DELETE FROM public.products WHERE sku IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_key ON public.products (sku);
