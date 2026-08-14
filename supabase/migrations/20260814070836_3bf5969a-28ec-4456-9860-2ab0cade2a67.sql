ALTER TABLE public.shipping_methods
  ADD COLUMN transport_mode text;

UPDATE public.shipping_methods
  SET transport_mode = CASE WHEN chargeable_metric = 'VOLUME' THEN 'sea' ELSE 'air' END;

ALTER TABLE public.shipping_methods
  ALTER COLUMN transport_mode SET NOT NULL,
  ALTER COLUMN transport_mode SET DEFAULT 'air',
  ADD CONSTRAINT shipping_methods_transport_mode_check CHECK (transport_mode IN ('air','sea'));