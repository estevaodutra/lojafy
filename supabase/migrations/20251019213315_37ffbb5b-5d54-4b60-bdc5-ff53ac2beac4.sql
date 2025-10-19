-- Update constraint to accept Google Drive and allow NULL
ALTER TABLE public.mandatory_notifications
DROP CONSTRAINT IF EXISTS mandatory_notifications_video_provider_check;

ALTER TABLE public.mandatory_notifications
ADD CONSTRAINT mandatory_notifications_video_provider_check
CHECK (
  video_provider IS NULL
  OR video_provider IN ('youtube', 'vimeo', 'google_drive', 'direct')
);