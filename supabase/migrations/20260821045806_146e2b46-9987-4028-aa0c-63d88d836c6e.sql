CREATE TABLE IF NOT EXISTS public.numtest_log (note text, id uuid, proposal_number text, at timestamptz default now());
REVOKE ALL ON public.numtest_log FROM anon, authenticated;
GRANT ALL ON public.numtest_log TO service_role;
ALTER TABLE public.numtest_log ENABLE ROW LEVEL SECURITY;

WITH c AS (SELECT id FROM public.clients ORDER BY name LIMIT 1),
ins AS (
  INSERT INTO public.proposals (client_id, project_name, incoterm, status, created_by_name)
  SELECT c.id, p.n, 'CIF', 'draft', 'Verify' FROM c, (VALUES ('NUMTEST A'),('NUMTEST B')) AS p(n)
  RETURNING id, proposal_number, project_name
)
INSERT INTO public.numtest_log (note, id, proposal_number) SELECT 'sequential ' || project_name, id, proposal_number FROM ins;

-- immutability probe
DO $$
BEGIN
  UPDATE public.proposals SET proposal_number = 'HACK-0001' WHERE project_name = 'NUMTEST A';
  INSERT INTO public.numtest_log (note) VALUES ('IMMUTABILITY FAILED - update allowed');
EXCEPTION WHEN others THEN
  INSERT INTO public.numtest_log (note) VALUES ('immutability exception: ' || SQLERRM);
END $$;