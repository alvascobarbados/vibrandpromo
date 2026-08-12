CREATE TABLE public.email_templates (
  template_type text PRIMARY KEY,
  subject text NOT NULL,
  heading text NOT NULL,
  body text NOT NULL DEFAULT '',
  signoff text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid,
  updated_by_name text NOT NULL DEFAULT ''
);

GRANT SELECT ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read email templates" ON public.email_templates
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE TRIGGER email_templates_set_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.email_templates (template_type, subject, heading, body, signoff) VALUES
  ('staff',
   'New quote request — {{company}} ({{items_count}} items)',
   'New quote request',
   'A new quote request came in on {{quote_date}}. The customer details and requested items are below.',
   'You can reply directly to {{customer_email}}.'),
  ('customer',
   'We''ve received your quote request — Vibrand',
   'Thanks — we''ve got your request',
   'Hi {{customer_name}},

Thank you for your quote request. Our team is reviewing it now and will get back to you with pricing, options and lead times within 24 hours (Monday to Friday).',
   'If anything needs changing in the meantime, just reply to this email.

Warm regards,
Vibrand Caribbean Inc.
sales@vibrand.com · +1 (246) 625-1000');

ALTER TABLE public.email_log ADD COLUMN html text;