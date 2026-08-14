UPDATE public.shipping_methods SET chargeable_unit = CASE upper(btrim(chargeable_unit))
  WHEN 'LBS' THEN 'LBS' WHEN 'LB' THEN 'LBS' WHEN 'POUNDS' THEN 'LBS'
  WHEN 'KG' THEN 'KG' WHEN 'KGS' THEN 'KG'
  WHEN 'CBM' THEN 'CBM' WHEN 'M3' THEN 'CBM'
  WHEN 'CUFT' THEN 'CUFT' WHEN 'FT3' THEN 'CUFT'
  ELSE 'LBS' END;

ALTER TABLE public.shipping_methods
  ADD CONSTRAINT shipping_methods_chargeable_unit_check
  CHECK (chargeable_unit IN ('KG','LBS','CBM','CUFT'));

ALTER TABLE public.product_sourcing
  ADD COLUMN dimension_unit text NULL,
  ADD COLUMN weight_unit text NULL;

ALTER TABLE public.product_sourcing
  ADD CONSTRAINT product_sourcing_dimension_unit_check CHECK (dimension_unit IN ('cm','in')),
  ADD CONSTRAINT product_sourcing_weight_unit_check CHECK (weight_unit IN ('kg','lb'));