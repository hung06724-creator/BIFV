-- Enable Supabase Realtime for app_state.
-- Run this once in Supabase SQL Editor (project mufserlsmawpvtjwasui).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'app_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_state;
  END IF;
END
$$;

-- Optional verification query.
-- SELECT pubname, schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'app_state';
