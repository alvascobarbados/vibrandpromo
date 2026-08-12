CREATE TABLE public.email_settings (
  id text PRIMARY KEY DEFAULT 'default',
  staff_notify_enabled boolean NOT NULL DEFAULT true,
  customer_confirm_enabled boolean NOT NULL DEFAULT true,
  recipients text[] NOT NULL DEFAULT '{}'::text[],
  reply_to text NOT NULL DEFAULT 'sales@vibrand.com',
  from_name text NOT NULL DEFAULT 'Vibrand',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.email_settings TO authenticated;
GRANT ALL ON public.email_settings TO service_role;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read email settings" ON public.email_settings
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE TRIGGER email_settings_updated_at BEFORE UPDATE ON public.email_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO public.email_settings (id, recipients)
VALUES ('default', ARRAY['avaswani@alvas.co']);

CREATE TABLE public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  recipient text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL,
  error text,
  quote_request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.email_log TO authenticated;
GRANT ALL ON public.email_log TO service_role;
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read email log" ON public.email_log
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE INDEX email_log_created_at_idx ON public.email_log (created_at DESC);

CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  phone text,
  territory text NOT NULL DEFAULT '',
  marketing_opt_in boolean NOT NULL DEFAULT false,
  first_request_at timestamptz NOT NULL DEFAULT now(),
  last_request_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read contacts" ON public.contacts
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();