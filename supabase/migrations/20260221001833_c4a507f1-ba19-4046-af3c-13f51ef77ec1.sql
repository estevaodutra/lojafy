CREATE POLICY "Anyone can read active feature_produtos"
  ON feature_produtos
  FOR SELECT
  TO authenticated
  USING (ativo = true);