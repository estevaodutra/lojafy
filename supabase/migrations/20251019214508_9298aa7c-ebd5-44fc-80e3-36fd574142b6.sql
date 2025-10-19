-- Add video_aspect_ratio column to mandatory_notifications
ALTER TABLE public.mandatory_notifications
ADD COLUMN video_aspect_ratio TEXT DEFAULT '9:16'
CHECK (video_aspect_ratio IN ('9:16', '16:9', '1:1', '4:3'));

COMMENT ON COLUMN public.mandatory_notifications.video_aspect_ratio IS 'Aspect ratio do vídeo: 9:16 (vertical/Stories), 16:9 (horizontal/YouTube), 1:1 (quadrado), 4:3 (clássico)';