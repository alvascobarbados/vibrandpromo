ALTER TABLE public.products
  ADD COLUMN air_lead_min integer,
  ADD COLUMN air_lead_max integer,
  ADD COLUMN sea_lead_min integer,
  ADD COLUMN sea_lead_max integer;

CREATE OR REPLACE FUNCTION public.validate_product_lead_times()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.air_lead_min IS NOT NULL AND NEW.air_lead_max IS NOT NULL AND NEW.air_lead_max < NEW.air_lead_min THEN
    RAISE EXCEPTION 'Air lead time maximum must be greater than or equal to the minimum';
  END IF;
  IF NEW.sea_lead_min IS NOT NULL AND NEW.sea_lead_max IS NOT NULL AND NEW.sea_lead_max < NEW.sea_lead_min THEN
    RAISE EXCEPTION 'Sea lead time maximum must be greater than or equal to the minimum';
  END IF;
  IF NEW.air_lead_min IS NOT NULL AND NEW.air_lead_min < 0 THEN
    RAISE EXCEPTION 'Air lead time minimum must be zero or more';
  END IF;
  IF NEW.sea_lead_min IS NOT NULL AND NEW.sea_lead_min < 0 THEN
    RAISE EXCEPTION 'Sea lead time minimum must be zero or more';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_validate_lead_times
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_lead_times();