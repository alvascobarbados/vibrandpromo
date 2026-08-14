-- Data-only reconciliation of courier/ocean costing rows to the original CSV export.

UPDATE public.shipping_method_routes r
SET include_inland_freight = false
FROM public.shipping_methods m, public.origins o, public.destinations d
WHERE r.shipping_method_id = m.id
  AND r.origin_id = o.id
  AND r.destination_id = d.id
  AND m.code = 'DHL'
  AND o.code = 'CHINA'
  AND d.code IN ('BB','CBN')
  AND r.include_inland_freight IS DISTINCT FROM false;

UPDATE public.shipping_method_tiers t
SET band_from = 61, band_to = NULL, rate = 4.22
WHERE t.id = (
  SELECT t2.id
  FROM public.shipping_method_tiers t2
  JOIN public.shipping_method_routes r ON r.id = t2.route_id
  JOIN public.shipping_methods m ON m.id = r.shipping_method_id
  JOIN public.origins o ON o.id = r.origin_id
  JOIN public.destinations d ON d.id = r.destination_id
  WHERE m.code = 'DHL' AND o.code = 'CHINA' AND d.code = 'CBN'
    AND t2.band_from = 0 AND t2.band_to IS NULL AND t2.rate = 0
  LIMIT 1
);