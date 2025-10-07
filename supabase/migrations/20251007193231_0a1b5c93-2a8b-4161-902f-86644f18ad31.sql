-- Create notification_campaigns table
CREATE TABLE notification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  target_user_ids UUID[],
  action_url TEXT,
  action_label TEXT,
  metadata JSONB,
  sent_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notification_campaigns ENABLE ROW LEVEL SECURITY;

-- Super admins can manage campaigns
CREATE POLICY "Super admins can manage campaigns"
ON notification_campaigns
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Function to send notification campaign
CREATE OR REPLACE FUNCTION send_notification_campaign(
  p_campaign_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_target_audience TEXT,
  p_target_user_ids UUID[],
  p_action_url TEXT,
  p_action_label TEXT,
  p_metadata JSONB
)
RETURNS INTEGER AS $$
DECLARE
  v_sent_count INTEGER := 0;
BEGIN
  IF p_target_audience = 'all' THEN
    INSERT INTO notifications (user_id, title, message, type, action_url, action_label, metadata)
    SELECT user_id, p_title, p_message, p_type, p_action_url, p_action_label, p_metadata
    FROM profiles
    WHERE is_active = true;
    GET DIAGNOSTICS v_sent_count = ROW_COUNT;
    
  ELSIF p_target_audience = 'customers' THEN
    INSERT INTO notifications (user_id, title, message, type, action_url, action_label, metadata)
    SELECT user_id, p_title, p_message, p_type, p_action_url, p_action_label, p_metadata
    FROM profiles
    WHERE role = 'customer' AND is_active = true;
    GET DIAGNOSTICS v_sent_count = ROW_COUNT;
    
  ELSIF p_target_audience = 'resellers' THEN
    INSERT INTO notifications (user_id, title, message, type, action_url, action_label, metadata)
    SELECT user_id, p_title, p_message, p_type, p_action_url, p_action_label, p_metadata
    FROM profiles
    WHERE role = 'reseller' AND is_active = true;
    GET DIAGNOSTICS v_sent_count = ROW_COUNT;
    
  ELSIF p_target_audience = 'suppliers' THEN
    INSERT INTO notifications (user_id, title, message, type, action_url, action_label, metadata)
    SELECT user_id, p_title, p_message, p_type, p_action_url, p_action_label, p_metadata
    FROM profiles
    WHERE role = 'supplier' AND is_active = true;
    GET DIAGNOSTICS v_sent_count = ROW_COUNT;
    
  ELSIF p_target_audience = 'specific' THEN
    INSERT INTO notifications (user_id, title, message, type, action_url, action_label, metadata)
    SELECT unnest(p_target_user_ids), p_title, p_message, p_type, p_action_url, p_action_label, p_metadata;
    GET DIAGNOSTICS v_sent_count = ROW_COUNT;
  END IF;
  
  -- Update campaign count
  UPDATE notification_campaigns
  SET sent_count = v_sent_count
  WHERE id = p_campaign_id;
  
  RETURN v_sent_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;