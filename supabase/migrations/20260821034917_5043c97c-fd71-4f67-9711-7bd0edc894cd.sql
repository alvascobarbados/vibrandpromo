CREATE TABLE public.proposal_settings (
  id text NOT NULL PRIMARY KEY DEFAULT 'default',
  filename_template text NOT NULL DEFAULT 'Vibrand Proposal - {client} - {project} - {date}',
  items_per_page integer NOT NULL DEFAULT 2 CHECK (items_per_page IN (2,3,4)),
  footer_text text NOT NULL DEFAULT 'Vibrand · Bridgetown, Barbados · sales@vibrand.com',
  validity_days integer NOT NULL DEFAULT 30 CHECK (validity_days > 0 AND validity_days <= 365),
  client_can_export boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT proposal_settings_single_row CHECK (id = 'default')
);

GRANT SELECT ON public.proposal_settings TO authenticated;
GRANT UPDATE ON public.proposal_settings TO authenticated;
GRANT ALL ON public.proposal_settings TO service_role;

ALTER TABLE public.proposal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read proposal settings"
  ON public.proposal_settings FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Admins can update proposal settings"
  ON public.proposal_settings FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_proposal_settings_updated_at
  BEFORE UPDATE ON public.proposal_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.proposal_settings (id) VALUES ('default');