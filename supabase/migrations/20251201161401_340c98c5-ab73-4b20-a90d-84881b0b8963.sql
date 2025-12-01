CREATE TABLE role_transition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  from_role app_role NOT NULL,
  to_role app_role NOT NULL,
  transitioned_by UUID,
  webhook_sent BOOLEAN DEFAULT false,
  webhook_sent_at TIMESTAMPTZ,
  welcome_popup_seen BOOLEAN DEFAULT false,
  welcome_popup_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_role_transition_user_id ON role_transition_logs(user_id);
CREATE INDEX idx_role_transition_to_role ON role_transition_logs(to_role);

ALTER TABLE role_transition_logs ENABLE ROW LEVEL SECURITY;