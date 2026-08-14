UPDATE public.products p
SET decoration_methods = sub.arr
FROM (
  SELECT
    id,
    ARRAY(
      SELECT DISTINCT CASE v
        WHEN 'Screen Printing' THEN 'Screen Print'
        WHEN 'Debossed Logo' THEN 'Deboss'
        WHEN 'Epoxy Dome' THEN '3D Doming'
        WHEN 'Gold Stamping' THEN 'Foil Stamping'
        WHEN 'Heat Transfer' THEN 'Heat Transfer Print'
        WHEN 'Sublimation (Full Colour)' THEN 'Full Colour Dye Sublimation'
        ELSE v
      END
      FROM unnest(decoration_methods) AS v
      ORDER BY 1
    ) AS arr
  FROM public.products
) sub
WHERE p.id = sub.id
  AND p.decoration_methods IS DISTINCT FROM sub.arr;