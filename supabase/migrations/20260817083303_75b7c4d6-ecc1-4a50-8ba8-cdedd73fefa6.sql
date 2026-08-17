DELETE FROM public.quote_request_items WHERE quote_request_id IN (SELECT id FROM public.quote_requests WHERE email LIKE 'zztest%' OR email LIKE 'zzpast%');
DELETE FROM public.quote_requests WHERE email LIKE 'zztest%' OR email LIKE 'zzpast%';
DELETE FROM public.contacts WHERE email LIKE 'zztest%' OR email LIKE 'zzpast%';