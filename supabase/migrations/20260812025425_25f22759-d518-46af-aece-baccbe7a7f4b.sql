ALTER TABLE public.products
  RENAME COLUMN production_days TO production_min_days;

ALTER TABLE public.products
  RENAME COLUMN rush_production_days TO rush_production_min_days;

ALTER TABLE public.products
  ADD COLUMN production_max_days integer,
  ADD COLUMN rush_production_max_days integer;

CREATE OR REPLACE FUNCTION public.validate_product_rush()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.production_max_days IS NOT NULL THEN
    IF NEW.production_min_days IS NULL THEN
      RAISE EXCEPTION 'Enter a minimum production time before adding a maximum.';
    END IF;
    IF NEW.production_max_days < NEW.production_min_days THEN
      RAISE EXCEPTION 'Maximum production time must be greater than or equal to the minimum.';
    END IF;
  END IF;

  IF NEW.rush_enabled THEN
    IF NEW.rush_production_min_days IS NULL THEN
      RAISE EXCEPTION 'Rush production time is required when rush is available.';
    END IF;
    IF NEW.rush_production_min_days < 1 THEN
      RAISE EXCEPTION 'Rush production time must be at least 1 day.';
    END IF;
    IF NEW.rush_production_max_days IS NOT NULL
       AND NEW.rush_production_max_days < NEW.rush_production_min_days THEN
      RAISE EXCEPTION 'Maximum rush production time must be greater than or equal to the minimum.';
    END IF;
    IF NEW.production_min_days IS NULL OR NEW.rush_production_min_days >= NEW.production_min_days THEN
      RAISE EXCEPTION 'Rush production time must be less than the normal production time.';
    END IF;
    IF NEW.shipping_methods = 'sea_only' THEN
      RAISE EXCEPTION 'Rush requires air shipping.';
    END IF;
  ELSE
    NEW.rush_production_max_days := NULL;
  END IF;
  RETURN NEW;
END;
$function$;