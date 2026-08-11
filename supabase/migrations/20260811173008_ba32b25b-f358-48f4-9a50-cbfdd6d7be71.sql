CREATE TABLE public.quote_submission_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.quote_submission_log TO service_role;

ALTER TABLE public.quote_submission_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX quote_submission_log_ip_created_idx
  ON public.quote_submission_log (ip_hash, created_at DESC);