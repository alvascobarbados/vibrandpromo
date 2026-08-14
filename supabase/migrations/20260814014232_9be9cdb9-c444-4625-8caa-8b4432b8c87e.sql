CREATE TABLE public.artwork_token_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.artwork_token_log TO service_role;

ALTER TABLE public.artwork_token_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX artwork_token_log_ip_created_idx ON public.artwork_token_log (ip_hash, created_at DESC);