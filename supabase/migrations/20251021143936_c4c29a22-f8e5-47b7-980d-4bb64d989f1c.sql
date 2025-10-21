-- Add new columns to support_tickets for better UX
ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- Add new columns to chat_messages for read receipts and attachments
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Create function to get last message preview
CREATE OR REPLACE FUNCTION get_last_message_preview(p_ticket_id UUID)
RETURNS TABLE(
  content TEXT,
  sender_type TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    SUBSTRING(cm.content, 1, 60) as content,
    cm.sender_type::TEXT as sender_type,
    cm.created_at
  FROM chat_messages cm
  WHERE cm.ticket_id = p_ticket_id
  ORDER BY cm.created_at DESC
  LIMIT 1;
$$;

-- Update existing tickets to populate customer_name from profiles
UPDATE support_tickets st
SET customer_name = COALESCE(p.first_name || ' ' || p.last_name, st.customer_email)
FROM profiles p
WHERE st.user_id = p.user_id
AND st.customer_name IS NULL;