ALTER TABLE public.product_decorations
  ADD COLUMN IF NOT EXISTS notes text NULL,
  ADD COLUMN IF NOT EXISTS ref_image_url text NULL;

CREATE POLICY "Staff read costing refs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'costing-refs' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff upload costing refs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'costing-refs' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff update costing refs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'costing-refs' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'costing-refs' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff delete costing refs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'costing-refs' AND public.is_staff(auth.uid()));