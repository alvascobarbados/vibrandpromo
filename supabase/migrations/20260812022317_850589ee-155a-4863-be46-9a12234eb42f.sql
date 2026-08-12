ALTER TABLE public.products
  ADD COLUMN shipping_methods text NOT NULL DEFAULT 'air_sea';

ALTER TABLE public.products
  ADD CONSTRAINT products_shipping_methods_check
  CHECK (shipping_methods IN ('air_sea', 'air_only', 'sea_only'));

ALTER TABLE public.quote_request_items
  ADD COLUMN shipping_methods text;

ALTER TABLE public.quote_request_items
  ADD CONSTRAINT quote_request_items_shipping_methods_check
  CHECK (shipping_methods IS NULL OR shipping_methods IN ('air_sea', 'air_only', 'sea_only'));