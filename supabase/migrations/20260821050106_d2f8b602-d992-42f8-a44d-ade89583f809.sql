DELETE FROM public.proposals WHERE project_name LIKE 'NUMTEST%' OR project_name LIKE '%PREFIX%';
DROP TABLE IF EXISTS public.numtest_log;