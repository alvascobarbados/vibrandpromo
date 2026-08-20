CREATE POLICY "Staff can delete clients" ON public.clients FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

DELETE FROM public.proposal_items WHERE proposal_id IN (
  SELECT p.id FROM public.proposals p
  JOIN public.clients c ON c.id = p.client_id
  WHERE c.name = 'ZZ TEST CLIENT'
);

DELETE FROM public.proposals WHERE client_id IN (
  SELECT id FROM public.clients WHERE name = 'ZZ TEST CLIENT'
);

DELETE FROM public.clients WHERE name = 'ZZ TEST CLIENT';