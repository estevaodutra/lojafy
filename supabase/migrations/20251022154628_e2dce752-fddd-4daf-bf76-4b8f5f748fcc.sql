-- Drop políticas antigas que não verificam access_level
DROP POLICY IF EXISTS "Users can view published modules of enrolled courses" ON course_modules;
DROP POLICY IF EXISTS "Users can view published lessons of enrolled courses" ON course_lessons;

-- Criar nova política para course_modules que verifica access_level
CREATE POLICY "Users can view published modules of accessible courses"
  ON public.course_modules
  FOR SELECT
  USING (
    is_published = true AND (
      -- Curso com acesso livre para todos
      EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id = course_modules.course_id
        AND c.access_level = 'all'
        AND c.is_published = true
      ) OR
      -- Usuário matriculado no curso
      EXISTS (
        SELECT 1 FROM course_enrollments ce
        WHERE ce.course_id = course_modules.course_id
        AND ce.user_id = auth.uid()
      ) OR
      -- Super admin tem acesso total
      EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid() AND role = 'super_admin'
      )
    )
  );

-- Criar nova política para course_lessons que verifica access_level
CREATE POLICY "Users can view published lessons of accessible courses"
  ON public.course_lessons
  FOR SELECT
  USING (
    is_published = true AND (
      -- Curso com acesso livre (via módulo)
      EXISTS (
        SELECT 1 FROM course_modules cm
        JOIN courses c ON c.id = cm.course_id
        WHERE cm.id = course_lessons.module_id
        AND c.access_level = 'all'
        AND c.is_published = true
      ) OR
      -- Usuário matriculado no curso
      EXISTS (
        SELECT 1 FROM course_enrollments ce
        JOIN course_modules cm ON cm.course_id = ce.course_id
        WHERE cm.id = course_lessons.module_id
        AND ce.user_id = auth.uid()
      ) OR
      -- Super admin tem acesso total
      EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid() AND role = 'super_admin'
      )
    )
  );