ALTER TABLE public.products ADD COLUMN status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live'));

UPDATE public.products SET status = CASE WHEN is_active THEN 'live' ELSE 'draft' END;

DROP POLICY "Active products are public" ON public.products;
ALTER TABLE public.products DROP COLUMN is_active;
CREATE POLICY "Live products are public" ON public.products FOR SELECT USING (status = 'live');

ALTER TABLE public.products ALTER COLUMN shipping_methods DROP NOT NULL;