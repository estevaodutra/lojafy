
CREATE OR REPLACE FUNCTION public.get_notification_logs(p_type_filter text DEFAULT NULL, p_limit integer DEFAULT 100)
RETURNS TABLE(
  type text,
  title text,
  message text,
  total_sent bigint,
  total_read bigint,
  read_rate numeric,
  sent_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    n.type,
    n.title,
    n.message,
    COUNT(*)::bigint AS total_sent,
    COUNT(*) FILTER (WHERE n.is_read = true)::bigint AS total_read,
    ROUND((COUNT(*) FILTER (WHERE n.is_read = true)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 1) AS read_rate,
    MAX(n.created_at) AS sent_at
  FROM notifications n
  WHERE (p_type_filter IS NULL OR n.type = p_type_filter)
  GROUP BY n.type, n.title, n.message
  ORDER BY sent_at DESC
  LIMIT p_limit;
$$;
