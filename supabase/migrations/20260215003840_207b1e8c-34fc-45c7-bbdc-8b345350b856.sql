UPDATE user_features
SET status = 'revogado', updated_at = NOW()
WHERE feature_id = '56f6d58f-5356-4b6f-8ab1-291ea450591f'
  AND user_id != 'b21170cb-2872-45df-b31b-bf977d93dc14'
  AND status IN ('ativo', 'trial');