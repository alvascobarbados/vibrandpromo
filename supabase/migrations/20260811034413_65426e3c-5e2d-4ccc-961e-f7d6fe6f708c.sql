-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','staff'))
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are public" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Staff manage categories" ON public.categories
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  description text,
  details text,
  price numeric(10,2),
  show_price boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  images text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active products are public" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Staff read all products" ON public.products
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update products" ON public.products
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete products" ON public.products
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Quote requests
CREATE TABLE public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  company text NOT NULL,
  email text NOT NULL,
  phone text,
  territory text NOT NULL,
  message text,
  artwork_url text,
  status text NOT NULL DEFAULT 'new',
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.quote_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_requests TO authenticated;
GRANT ALL ON public.quote_requests TO service_role;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a quote request" ON public.quote_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff read quote requests" ON public.quote_requests
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff update quote requests" ON public.quote_requests
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete quote requests" ON public.quote_requests
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE public.quote_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.quote_request_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_request_items TO authenticated;
GRANT ALL ON public.quote_request_items TO service_role;
ALTER TABLE public.quote_request_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can add quote items" ON public.quote_request_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff read quote items" ON public.quote_request_items
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete quote items" ON public.quote_request_items
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- Seed categories
INSERT INTO public.categories (name, slug, image_url, sort_order) VALUES
  ('Apparel','apparel','https://picsum.photos/seed/alvasco-apparel/800/800',1),
  ('Bags','bags','https://picsum.photos/seed/alvasco-bags/800/800',2),
  ('Drinkware','drinkware','https://picsum.photos/seed/alvasco-drinkware/800/800',3),
  ('Barware & Food Service','barware-food-service','https://picsum.photos/seed/alvasco-barware/800/800',4),
  ('Accessories & Novelties','accessories-novelties','https://picsum.photos/seed/alvasco-accessories/800/800',5),
  ('Advertising & Display','advertising-display','https://picsum.photos/seed/alvasco-advertising/800/800',6),
  ('Office & Stationery','office-stationery','https://picsum.photos/seed/alvasco-office/800/800',7),
  ('Technology','technology','https://picsum.photos/seed/alvasco-technology/800/800',8),
  ('Tools & Automotive','tools-automotive','https://picsum.photos/seed/alvasco-tools/800/800',9),
  ('Keyrings','keyrings','https://picsum.photos/seed/alvasco-keyrings/800/800',10);

-- Seed products
INSERT INTO public.products (name, slug, category_id, description, details, price, show_price, is_featured, images)
SELECT v.name, v.slug, c.id, v.description, v.details, v.price, v.show_price, v.is_featured,
       ARRAY['https://picsum.photos/seed/' || v.slug || '/900/900', 'https://picsum.photos/seed/' || v.slug || '-b/900/900']
FROM (VALUES
  ('Classic Cotton Polo','classic-cotton-polo','apparel','Breathable 100% ring-spun cotton polo, ideal for corporate uniforms and events.','Sizes S–3XL. Embroidery or screen print. 12 colours available.',24.50,true,true),
  ('Performance T-Shirt','performance-t-shirt','apparel','Moisture-wicking tee for staff teams, races and giveaways.','Unisex fit. Sizes XS–2XL. Full-colour print available.',14.00,true,false),
  ('Non-Woven Tote Bag','non-woven-tote-bag','bags','Budget-friendly reusable tote — a Caribbean retail favourite.','80gsm non-woven. 15" x 16" with 22" handles.',3.75,true,true),
  ('Executive Laptop Backpack','executive-laptop-backpack','bags','Padded 15" laptop compartment with USB pass-through.','Water-resistant polyester. Debossed or embroidered logo.',NULL,false,false),
  ('Vacuum Insulated Tumbler','vacuum-insulated-tumbler','drinkware','Double-wall stainless steel tumbler keeps drinks cold for 24 hours.','20oz. Laser engraving. 6 finishes.',18.90,true,true),
  ('Ceramic Coffee Mug','ceramic-coffee-mug','drinkware','Classic 11oz mug — the office staple.','Dishwasher safe. Wrap print available.',6.25,true,false),
  ('Stainless Cocktail Shaker Set','stainless-cocktail-shaker-set','barware-food-service','Three-piece bar set for hospitality gifting and rum brands.','18/8 stainless. Engraved logo.',NULL,false,false),
  ('Silicone Wristband','silicone-wristband','accessories-novelties','Debossed silicone bands for events, schools and fundraisers.','Adult and youth sizes. Any Pantone colour.',0.95,true,false),
  ('Retractable Roll-Up Banner','retractable-roll-up-banner','advertising-display','Portable pull-up banner with carry bag for trade shows.','33" x 79". Full-colour print, aluminium base.',NULL,false,true),
  ('Hardcover A5 Notebook','hardcover-a5-notebook','office-stationery','PU-cover notebook with elastic closure and ribbon marker.','80 lined pages. Deboss or foil stamp.',9.40,true,false),
  ('10,000mAh Power Bank','10000mah-power-bank','technology','Dual-output power bank with a large branding area.','USB-A + USB-C. Laser engraved or printed.',NULL,false,true),
  ('Leather Keyring Fob','leather-keyring-fob','keyrings','Stitched leather fob with polished metal ring.','Genuine or vegan leather. Deboss or metal plate.',4.50,true,false)
) AS v(name, slug, cat_slug, description, details, price, show_price, is_featured)
JOIN public.categories c ON c.slug = v.cat_slug;