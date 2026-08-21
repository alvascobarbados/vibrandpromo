INSERT INTO public.proposal_items (proposal_id, product_id, position)
SELECT '3b7a0dc3-2dec-4bbd-808c-695613044a48', id, row_number() OVER (ORDER BY name)
FROM (SELECT id, name FROM public.products WHERE status = 'live' ORDER BY name LIMIT 3) s;