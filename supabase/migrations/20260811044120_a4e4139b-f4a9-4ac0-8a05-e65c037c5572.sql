-- Give sample products multiple gallery images so the card carousel is visible
UPDATE public.products
SET images = ARRAY[
  'https://picsum.photos/seed/' || slug || '/900/900',
  'https://picsum.photos/seed/' || slug || '-b/900/900',
  'https://picsum.photos/seed/' || slug || '-c/900/900',
  'https://picsum.photos/seed/' || slug || '-d/900/900'
]
WHERE sku IN ('102001','102003','102005','102009','102015','102019','102022','102024');

UPDATE public.products
SET images = ARRAY[
  'https://picsum.photos/seed/' || slug || '/900/900',
  'https://picsum.photos/seed/' || slug || '-b/900/900',
  'https://picsum.photos/seed/' || slug || '-c/900/900'
]
WHERE sku IN ('102002','102004','102006','102013','102016','102018','102021','102023');
