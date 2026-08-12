ALTER TABLE public.products
  ADD COLUMN rush_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN rush_production_days integer;

CREATE OR REPLACE FUNCTION public.validate_product_rush()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.rush_enabled THEN
    IF NEW.rush_production_days IS NULL THEN
      RAISE EXCEPTION 'Rush production time is required when rush is available.';
    END IF;
    IF NEW.rush_production_days < 1 THEN
      RAISE EXCEPTION 'Rush production time must be at least 1 day.';
    END IF;
    IF NEW.production_days IS NULL OR NEW.rush_production_days >= NEW.production_days THEN
      RAISE EXCEPTION 'Rush production time must be less than the normal production time.';
    END IF;
    IF NEW.shipping_methods = 'sea_only' THEN
      RAISE EXCEPTION 'Rush requires air shipping.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_validate_rush
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.validate_product_rush();