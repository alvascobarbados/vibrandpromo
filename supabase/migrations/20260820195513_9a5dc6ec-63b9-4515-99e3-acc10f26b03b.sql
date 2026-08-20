ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS payment_terms text NOT NULL DEFAULT 'Net 30',
  ADD COLUMN IF NOT EXISTS payment_terms_custom_days integer,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS incoterm text,
  ADD COLUMN IF NOT EXISTS order_confirmation_config jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_incoterm_check;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_incoterm_check
  CHECK (incoterm IS NULL OR incoterm IN ('CIF','FOB','LDF','LDP'));

DROP TRIGGER IF EXISTS clients_updated_at ON public.clients;
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();