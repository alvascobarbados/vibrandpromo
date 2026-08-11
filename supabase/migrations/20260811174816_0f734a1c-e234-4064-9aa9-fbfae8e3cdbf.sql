CREATE TABLE public.page_access_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  page text NOT NULL CHECK (page IN ('products','categories','bulk_images','import','quotes')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, page)
);

GRANT SELECT ON public.page_access_locks TO authenticated;
GRANT ALL ON public.page_access_locks TO service_role;

ALTER TABLE public.page_access_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own locks" ON public.page_access_locks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all locks" ON public.page_access_locks
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION private.can_use_page(_user_id uuid, _page text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN private.is_admin(_user_id) THEN true
    WHEN NOT private.is_staff(_user_id) THEN false
    ELSE NOT EXISTS (
      SELECT 1 FROM public.page_access_locks l
      WHERE l.user_id = _user_id AND l.page = _page
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.can_use_page(_user_id uuid, _page text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT private.can_use_page(_user_id, _page)
$$;

-- Products: Products or Import access
DROP POLICY IF EXISTS "Staff insert products" ON public.products;
DROP POLICY IF EXISTS "Staff update products" ON public.products;
DROP POLICY IF EXISTS "Staff delete products" ON public.products;

CREATE POLICY "Staff insert products" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (public.can_use_page(auth.uid(),'products') OR public.can_use_page(auth.uid(),'import'));

CREATE POLICY "Staff update products" ON public.products
  FOR UPDATE TO authenticated
  USING (public.can_use_page(auth.uid(),'products') OR public.can_use_page(auth.uid(),'import'))
  WITH CHECK (public.can_use_page(auth.uid(),'products') OR public.can_use_page(auth.uid(),'import'));

CREATE POLICY "Staff delete products" ON public.products
  FOR DELETE TO authenticated
  USING (public.can_use_page(auth.uid(),'products') OR public.can_use_page(auth.uid(),'import'));

-- Categories / subcategories: Categories access
DROP POLICY IF EXISTS "Staff manage categories" ON public.categories;
CREATE POLICY "Staff manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.can_use_page(auth.uid(),'categories'))
  WITH CHECK (public.can_use_page(auth.uid(),'categories'));

DROP POLICY IF EXISTS "Staff manage subcategories" ON public.subcategories;
CREATE POLICY "Staff manage subcategories" ON public.subcategories
  FOR ALL TO authenticated
  USING (public.can_use_page(auth.uid(),'categories'))
  WITH CHECK (public.can_use_page(auth.uid(),'categories'));

-- Quote requests: Quote Requests access for writes
DROP POLICY IF EXISTS "Staff update quote requests" ON public.quote_requests;
CREATE POLICY "Staff update quote requests" ON public.quote_requests
  FOR UPDATE TO authenticated
  USING (public.can_use_page(auth.uid(),'quotes'))
  WITH CHECK (public.can_use_page(auth.uid(),'quotes'));

DROP POLICY IF EXISTS "Staff delete quote requests" ON public.quote_requests;
CREATE POLICY "Staff delete quote requests" ON public.quote_requests
  FOR DELETE TO authenticated
  USING (public.can_use_page(auth.uid(),'quotes'));

DROP POLICY IF EXISTS "Staff delete quote items" ON public.quote_request_items;
CREATE POLICY "Staff delete quote items" ON public.quote_request_items
  FOR DELETE TO authenticated
  USING (public.can_use_page(auth.uid(),'quotes'));

-- Storage: product image writes
DROP POLICY IF EXISTS "Staff upload product images" ON storage.objects;
CREATE POLICY "Staff upload product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images' AND (
      public.can_use_page(auth.uid(),'products')
      OR public.can_use_page(auth.uid(),'bulk_images')
      OR public.can_use_page(auth.uid(),'import')
    )
  );

DROP POLICY IF EXISTS "Staff update product images" ON storage.objects;
CREATE POLICY "Staff update product images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images' AND (
      public.can_use_page(auth.uid(),'products')
      OR public.can_use_page(auth.uid(),'bulk_images')
      OR public.can_use_page(auth.uid(),'import')
    )
  );

DROP POLICY IF EXISTS "Staff delete product images" ON storage.objects;
CREATE POLICY "Staff delete product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images' AND (
      public.can_use_page(auth.uid(),'products')
      OR public.can_use_page(auth.uid(),'bulk_images')
      OR public.can_use_page(auth.uid(),'import')
    )
  );
