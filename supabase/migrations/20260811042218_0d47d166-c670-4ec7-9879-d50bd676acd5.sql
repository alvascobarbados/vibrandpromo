ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS moq integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS production_days integer NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS colour_option text NOT NULL DEFAULT 'Fully Customised',
  ADD COLUMN IF NOT EXISTS decoration_methods text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS inventory_source text NOT NULL DEFAULT 'Factory Direct',
  ADD COLUMN IF NOT EXISTS material text;

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_key ON public.products (sku);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_colour_option_check,
  ADD CONSTRAINT products_colour_option_check CHECK (colour_option IN ('Fully Customised','Stock Colours'));

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_inventory_source_check,
  ADD CONSTRAINT products_inventory_source_check CHECK (inventory_source IN ('USA Inventory','Factory Direct'));

-- Real category list
UPDATE public.categories SET name = 'Accessories', slug = 'accessories' WHERE slug = 'accessories-novelties';
UPDATE public.categories SET name = 'Technology Tools & Automotive', slug = 'technology-tools-automotive' WHERE slug = 'technology';

UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug = 'technology-tools-automotive')
WHERE category_id = (SELECT id FROM public.categories WHERE slug = 'tools-automotive');
DELETE FROM public.categories WHERE slug = 'tools-automotive';

INSERT INTO public.categories (name, slug, sort_order)
SELECT v.name, v.slug, v.sort_order FROM (VALUES
  ('Outdoor Sports & Games','outdoor-sports-games', 80),
  ('Home & Kitchen','home-kitchen', 90),
  ('Awards & Recognition','awards-recognition', 100)
) AS v(name, slug, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.slug = v.slug);

UPDATE public.categories SET sort_order = x.ord FROM (VALUES
  ('accessories',10),('advertising-display',20),('apparel',30),('bags',40),
  ('barware-food-service',50),('drinkware',60),('office-stationery',70),
  ('outdoor-sports-games',80),('technology-tools-automotive',90),
  ('home-kitchen',100),('awards-recognition',110),('keyrings',120)
) AS x(slug, ord) WHERE public.categories.slug = x.slug;