ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS internal_notes_updated_by uuid,
  ADD COLUMN IF NOT EXISTS internal_notes_updated_by_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS internal_notes_updated_at timestamp with time zone;