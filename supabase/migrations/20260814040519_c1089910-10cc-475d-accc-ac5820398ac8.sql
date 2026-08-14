INSERT INTO public.decoration_methods (code, name, sub_rule_type)
SELECT v.code, v.name, 'A'
FROM (VALUES ('3DP','3D Printing'), ('STK','Sticker Logo'), ('WVP','Woven Patch')) AS v(code, name)
WHERE NOT EXISTS (SELECT 1 FROM public.decoration_methods dm WHERE dm.code = v.code);

INSERT INTO public.method_details (decoration_method_id, code, detail, n_setup, n_run)
SELECT dm.id, dm.code, dm.name, 0, 0
FROM public.decoration_methods dm
WHERE dm.code IN ('3DP', 'STK', 'WVP')
  AND NOT EXISTS (
    SELECT 1 FROM public.method_details md
    WHERE md.decoration_method_id = dm.id AND md.code = dm.code
  );