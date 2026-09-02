ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS installer_id uuid REFERENCES public.installers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS requests_installer_id_idx ON public.requests (installer_id);
CREATE INDEX IF NOT EXISTS installer_schedules_installer_idx ON public.installer_schedules (installer_id, weekday);
CREATE INDEX IF NOT EXISTS installer_blocks_installer_idx ON public.installer_blocks (installer_id, start_date, end_date);