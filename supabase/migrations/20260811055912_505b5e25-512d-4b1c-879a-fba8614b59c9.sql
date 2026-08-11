-- 1. subcategories table
CREATE TABLE public.subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, slug)
);

GRANT SELECT ON public.subcategories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subcategories TO authenticated;
GRANT ALL ON public.subcategories TO service_role;

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subcategories are public" ON public.subcategories FOR SELECT USING (true);
CREATE POLICY "Staff manage subcategories" ON public.subcategories FOR ALL TO authenticated
  USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

CREATE TRIGGER subcategories_updated_at BEFORE UPDATE ON public.subcategories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. category renames + retire Keyrings category
UPDATE public.categories SET name = 'Outdoor, Sports & Games' WHERE slug = 'outdoor-sports-games';
UPDATE public.categories SET name = 'Technology, Tools & Automotive' WHERE slug = 'technology-tools-automotive';
UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug = 'technology-tools-automotive')
  WHERE category_id = (SELECT id FROM public.categories WHERE slug = 'keyrings');
DELETE FROM public.categories WHERE slug = 'keyrings';

-- 3. products.subcategory_id
ALTER TABLE public.products ADD COLUMN subcategory_id uuid REFERENCES public.subcategories(id) ON DELETE RESTRICT;

-- 4. seed subcategories
INSERT INTO public.subcategories (name, slug, category_id, sort_order)
SELECT s.name, s.slug, c.id, s.sort_order
FROM (VALUES
  ('accessories','Fans','fans',10),
  ('accessories','Lanyards & Wristbands','lanyards-wristbands',20),
  ('accessories','Novelties & Stress Relievers','novelties-stress-relievers',30),
  ('accessories','Pet Accessories','pet-accessories',40),
  ('accessories','Travel Accessories','travel-accessories',50),
  ('advertising-display','Standing & Retractable Banners','standing-retractable-banners',10),
  ('advertising-display','Feather & Flying Banners','feather-flying-banners',20),
  ('advertising-display','Promotion Counters & Brand Activations','promotion-counters-brand-activations',30),
  ('advertising-display','Tents & Market Umbrellas','tents-market-umbrellas',40),
  ('advertising-display','Printed Banners, Pennants & Bunting','printed-banners-pennants-bunting',50),
  ('advertising-display','Retail POS & Merchandising','retail-pos-merchandising',60),
  ('apparel','Shirts & Polos','shirts-polos',10),
  ('apparel','Hats & Caps','hats-caps',20),
  ('apparel','Towels, Bandanas & Sunglasses','towels-bandanas-sunglasses',30),
  ('bags','Tote & Shopping Bags','tote-shopping-bags',10),
  ('bags','Cooler & Lunch Bags','cooler-lunch-bags',20),
  ('bags','Drawstring Bags','drawstring-bags',30),
  ('bags','Backpacks, Laptop & Messenger Bags','backpacks-laptop-messenger-bags',40),
  ('bags','Gym & Duffel Bags','gym-duffel-bags',50),
  ('barware-food-service','Bar Tools & Equipment','bar-tools-equipment',10),
  ('barware-food-service','Bar Signage & Displays','bar-signage-displays',20),
  ('barware-food-service','Trays & Serveware','trays-serveware',30),
  ('barware-food-service','Packaging & Food Service','packaging-food-service',40),
  ('barware-food-service','Glassware','glassware',50),
  ('barware-food-service','Coasters','coasters',60),
  ('drinkware','Tumblers & Travel Mugs','tumblers-travel-mugs',10),
  ('drinkware','Thermos, Vacuum Flasks & Water Bottles','thermos-vacuum-flasks-water-bottles',20),
  ('drinkware','Disposable & Stadium Cups','disposable-stadium-cups',30),
  ('drinkware','Ceramic, Bamboo & Specialty Mugs','ceramic-bamboo-specialty-mugs',40),
  ('drinkware','Drinkware Accessories','drinkware-accessories',50),
  ('office-stationery','Writing Instruments','writing-instruments',10),
  ('office-stationery','Notebooks & Writing Pads','notebooks-writing-pads',20),
  ('office-stationery','Stationery Accessories & Sets','stationery-accessories-sets',30),
  ('outdoor-sports-games','Beach & Outdoor','beach-outdoor',10),
  ('outdoor-sports-games','Fitness & Wellness','fitness-wellness',20),
  ('outdoor-sports-games','Umbrellas','umbrellas',30),
  ('outdoor-sports-games','Games & Puzzles','games-puzzles',40),
  ('outdoor-sports-games','Sport Balls, Equipment & Golf','sport-balls-equipment-golf',50),
  ('technology-tools-automotive','Keyrings','keyrings',10),
  ('technology-tools-automotive','Car Accessories','car-accessories',20),
  ('technology-tools-automotive','Technology & Electronics','technology-electronics',30),
  ('technology-tools-automotive','Tools, Lighting & Safety','tools-lighting-safety',40),
  ('home-kitchen','Kitchen Gadgets & Accessories','kitchen-gadgets-accessories',10),
  ('home-kitchen','Corporate & Lifestyle Gift Sets','corporate-lifestyle-gift-sets',20),
  ('awards-recognition','Lapel Pins & Badges','lapel-pins-badges',10)
) AS s(cat_slug, name, slug, sort_order)
JOIN public.categories c ON c.slug = s.cat_slug;

-- 5. assign existing products
UPDATE public.products p
SET subcategory_id = s.id, category_id = s.category_id
FROM (VALUES
  ('102013','fans'),
  ('102011','lanyards-wristbands'),
  ('102020','lapel-pins-badges'),
  ('102023','feather-flying-banners'),
  ('102010','standing-retractable-banners'),
  ('102001','shirts-polos'),
  ('102002','shirts-polos'),
  ('102015','hats-caps'),
  ('102019','lapel-pins-badges'),
  ('102004','backpacks-laptop-messenger-bags'),
  ('102022','cooler-lunch-bags'),
  ('102016','tote-shopping-bags'),
  ('102003','tote-shopping-bags'),
  ('102024','glassware'),
  ('102007','bar-tools-equipment'),
  ('102006','ceramic-bamboo-specialty-mugs'),
  ('102005','tumblers-travel-mugs'),
  ('102018','kitchen-gadgets-accessories'),
  ('102012','keyrings'),
  ('102008','notebooks-writing-pads'),
  ('102021','writing-instruments'),
  ('102017','beach-outdoor'),
  ('102009','technology-electronics'),
  ('102014','technology-electronics')
) AS m(sku, sub_slug)
JOIN public.subcategories s ON s.slug = m.sub_slug
WHERE p.sku = m.sku;

-- 6. extra seed products so every category shelf has at least two items
INSERT INTO public.products
  (name, slug, sku, category_id, subcategory_id, description, price, show_price, is_active, is_featured,
   images, moq, production_days, colour_option, decoration_methods, inventory_source, material)
SELECT v.name, v.slug, v.sku, s.category_id, s.id, v.description, v.price, true, true, false,
       ARRAY[v.image], v.moq, v.production_days, v.colour_option, v.deco, v.source, v.material
FROM (VALUES
  ('Silicone Kitchen Utensil Set','silicone-kitchen-utensil-set','102025','kitchen-gadgets-accessories',
   'Five-piece heat-resistant silicone utensil set with branded bamboo handles.',
   18.50::numeric,50,14,'Stock Colours',ARRAY['Laser Engraving','UV Printing'],'Factory Direct','Silicone & Bamboo',
   'https://picsum.photos/seed/vibrand-utensil-set/900/900'),
  ('Caribbean Corporate Gift Set','caribbean-corporate-gift-set','102026','corporate-lifestyle-gift-sets',
   'Presentation gift box with notebook, pen and vacuum flask, fully branded.',
   42.00::numeric,25,18,'Fully Customised',ARRAY['Screen Printing','Gold Stamping'],'Factory Direct','Mixed Materials',
   'https://picsum.photos/seed/vibrand-gift-set/900/900'),
  ('Vented Golf Umbrella','vented-golf-umbrella','102027','umbrellas',
   'Double-canopy 30" golf umbrella with fibreglass ribs and rubber grip.',
   21.75::numeric,50,16,'Stock Colours',ARRAY['Screen Printing','Sublimation (Full Colour)'],'USA Inventory','190T Polyester',
   'https://picsum.photos/seed/vibrand-golf-umbrella/900/900'),
  ('Yoga Mat with Carry Strap','yoga-mat-carry-strap','102028','fitness-wellness',
   'Non-slip 6mm TPE yoga mat with branded carry strap.',
   24.00::numeric,50,20,'Stock Colours',ARRAY['Heat Transfer','Screen Printing'],'Factory Direct','TPE Foam',
   'https://picsum.photos/seed/vibrand-yoga-mat/900/900')
) AS v(name, slug, sku, sub_slug, description, price, moq, production_days, colour_option, deco, source, material, image)
JOIN public.subcategories s ON s.slug = v.sub_slug;

-- 7. subcategory is now required
ALTER TABLE public.products ALTER COLUMN subcategory_id SET NOT NULL;
