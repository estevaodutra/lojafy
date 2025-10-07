-- Criar tipo ENUM para níveis de acesso aos cursos
CREATE TYPE course_access_level AS ENUM (
  'all',        -- Todos os usuários
  'customer',   -- Apenas clientes
  'supplier',   -- Apenas fornecedores
  'reseller'    -- Apenas revendedores
);

-- Adicionar coluna access_level na tabela courses
ALTER TABLE courses 
ADD COLUMN access_level course_access_level DEFAULT 'all' NOT NULL;

-- Criar policy para permitir matrícula automática baseada no access_level
CREATE POLICY "Users can enroll based on course access level"
ON course_enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses c
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE c.id = course_id
    AND (
      c.access_level = 'all' 
      OR (c.access_level = 'customer' AND p.role = 'customer')
      OR (c.access_level = 'supplier' AND p.role = 'supplier')
      OR (c.access_level = 'reseller' AND p.role = 'reseller')
    )
  )
);