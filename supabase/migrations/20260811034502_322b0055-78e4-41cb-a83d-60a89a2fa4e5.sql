CREATE POLICY "Product images readable by everyone" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Staff upload product images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff update product images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff delete product images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND public.is_staff(auth.uid()));

CREATE POLICY "Anyone can upload artwork" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'quote-artwork');
CREATE POLICY "Staff read artwork" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'quote-artwork' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff delete artwork" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'quote-artwork' AND public.is_staff(auth.uid()));