-- 1a. counters table: no client access at all
CREATE TABLE IF NOT EXISTS public.proposal_counters (
  year int PRIMARY KEY,
  last_number int NOT NULL DEFAULT 0
);
REVOKE ALL ON public.proposal_counters FROM anon, authenticated;
GRANT ALL ON public.proposal_counters TO service_role;
ALTER TABLE public.proposal_counters ENABLE ROW LEVEL SECURITY;

-- 2. settings prefix
ALTER TABLE public.proposal_settings
  ADD COLUMN IF NOT EXISTS number_prefix text NOT NULL DEFAULT 'VP';

-- default filename template gains {number} (only for the untouched old default)
UPDATE public.proposal_settings
  SET filename_template = 'Vibrand Proposal - {number} - {client} - {project} - {date}'
  WHERE filename_template = 'Vibrand Proposal - {client} - {project} - {date}';

-- 1b. number column (nullable during backfill)
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS proposal_number text;

-- 1c. allocator
CREATE OR REPLACE FUNCTION public.assign_proposal_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year int;
  v_next int;
  v_prefix text;
BEGIN
  IF NEW.proposal_number IS NOT NULL THEN
    RETURN NEW;
  END IF;
  v_year := extract(year from now())::int;
  SELECT coalesce(nullif(btrim(number_prefix), ''), 'VP') INTO v_prefix
    FROM public.proposal_settings WHERE id = 'default';
  v_prefix := coalesce(v_prefix, 'VP');

  INSERT INTO public.proposal_counters (year, last_number)
  VALUES (v_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = public.proposal_counters.last_number + 1
  RETURNING last_number INTO v_next;

  NEW.proposal_number := v_prefix || '-' || v_year::text || '-' || lpad(v_next::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proposals_assign_number ON public.proposals;
CREATE TRIGGER trg_proposals_assign_number
  BEFORE INSERT ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.assign_proposal_number();

-- 1d. immutability
CREATE OR REPLACE FUNCTION public.protect_proposal_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.proposal_number IS NOT NULL AND NEW.proposal_number IS DISTINCT FROM OLD.proposal_number THEN
    RAISE EXCEPTION 'proposal_number is immutable (% cannot become %)', OLD.proposal_number, NEW.proposal_number;
  END IF;
  IF OLD.proposal_number IS NOT NULL AND NEW.proposal_number IS NULL THEN
    NEW.proposal_number := OLD.proposal_number;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proposals_protect_number ON public.proposals;
CREATE TRIGGER trg_proposals_protect_number
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.protect_proposal_number();

-- 1e. backfill in created_at order per creation year
WITH prefix AS (
  SELECT coalesce(nullif(btrim(number_prefix), ''), 'VP') AS p
    FROM public.proposal_settings WHERE id = 'default'
), ranked AS (
  SELECT id,
         extract(year from created_at)::int AS yr,
         row_number() OVER (PARTITION BY extract(year from created_at)::int ORDER BY created_at, id) AS seq
    FROM public.proposals
   WHERE proposal_number IS NULL
)
UPDATE public.proposals p
   SET proposal_number = coalesce((SELECT p FROM prefix), 'VP') || '-' || r.yr::text || '-' || lpad(r.seq::text, 4, '0')
  FROM ranked r
 WHERE p.id = r.id;

-- counters continue cleanly
INSERT INTO public.proposal_counters (year, last_number)
SELECT extract(year from created_at)::int, count(*)::int
  FROM public.proposals
 GROUP BY 1
ON CONFLICT (year) DO UPDATE
  SET last_number = GREATEST(public.proposal_counters.last_number, EXCLUDED.last_number);

ALTER TABLE public.proposals ALTER COLUMN proposal_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS proposals_proposal_number_key ON public.proposals (proposal_number);