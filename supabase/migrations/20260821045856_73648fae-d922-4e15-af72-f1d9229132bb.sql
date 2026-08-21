UPDATE public.proposal_settings SET number_prefix='ZZ' WHERE id='default';

WITH c AS (SELECT id FROM public.clients ORDER BY name LIMIT 1),
ins AS (
  INSERT INTO public.proposals (client_id, project_name, incoterm, status, created_by_name)
  SELECT id,'NUMTEST PREFIX2','CIF','draft','Verify' FROM c
  RETURNING id, proposal_number
)
INSERT INTO public.numtest_log (note, id, proposal_number) SELECT 'prefix ZZ', id, proposal_number FROM ins;

UPDATE public.proposal_settings SET number_prefix='VP' WHERE id='default';

-- regenerate simulation on the real generated proposal: number + token untouched
WITH upd AS (
  UPDATE public.proposals SET status='generated', generated_at=now(), edited_since_generated=false
  WHERE proposal_number='VP-2026-0001'
  RETURNING id, proposal_number, share_token
)
INSERT INTO public.numtest_log (note, id, proposal_number)
SELECT 'regenerated token=' || coalesce(left(share_token,6),'none'), id, proposal_number FROM upd;