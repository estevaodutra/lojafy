-- Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  instructor_name TEXT,
  duration_hours INTEGER,
  level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  price NUMERIC(10,2) DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create course_modules table
CREATE TABLE IF NOT EXISTS public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER DEFAULT 1,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_modules_course ON course_modules(course_id);

-- Create course_lessons table
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  video_url TEXT,
  duration_minutes INTEGER,
  position INTEGER DEFAULT 1,
  is_published BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_lessons_module ON course_lessons(module_id);

-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  progress_percentage INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);

-- Create lesson_progress table
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  watch_time_seconds INTEGER DEFAULT 0,
  last_position_seconds INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_enrollment ON lesson_progress(enrollment_id);

-- Enable RLS on all tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses
CREATE POLICY "Super admins can manage courses"
  ON public.courses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'super_admin'::app_role
    )
  );

CREATE POLICY "Anyone can view published courses"
  ON public.courses
  FOR SELECT
  USING (is_published = true);

-- RLS Policies for course_modules
CREATE POLICY "Super admins can manage modules"
  ON public.course_modules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'super_admin'::app_role
    )
  );

CREATE POLICY "Users can view published modules of enrolled courses"
  ON public.course_modules
  FOR SELECT
  USING (
    is_published = true AND (
      EXISTS (
        SELECT 1 FROM course_enrollments ce
        WHERE ce.course_id = course_modules.course_id
        AND ce.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid() AND role = 'super_admin'::app_role
      )
    )
  );

-- RLS Policies for course_lessons
CREATE POLICY "Super admins can manage lessons"
  ON public.course_lessons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'super_admin'::app_role
    )
  );

CREATE POLICY "Users can view published lessons of enrolled courses"
  ON public.course_lessons
  FOR SELECT
  USING (
    is_published = true AND (
      EXISTS (
        SELECT 1 FROM course_enrollments ce
        JOIN course_modules cm ON cm.course_id = ce.course_id
        WHERE cm.id = course_lessons.module_id
        AND ce.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid() AND role = 'super_admin'::app_role
      )
    )
  );

-- RLS Policies for course_enrollments
CREATE POLICY "Super admins can manage all enrollments"
  ON public.course_enrollments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'super_admin'::app_role
    )
  );

CREATE POLICY "Users can view their own enrollments"
  ON public.course_enrollments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can create enrollments"
  ON public.course_enrollments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'super_admin'::app_role
    )
  );

-- RLS Policies for lesson_progress
CREATE POLICY "Users can manage their own progress"
  ON public.lesson_progress
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all progress"
  ON public.lesson_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'super_admin'::app_role
    )
  );

-- Function to update course progress
CREATE OR REPLACE FUNCTION public.update_course_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_lessons INTEGER;
  completed_lessons INTEGER;
  new_progress INTEGER;
BEGIN
  -- Count total published lessons in the course
  SELECT COUNT(DISTINCT cl.id) INTO total_lessons
  FROM course_lessons cl
  JOIN course_modules cm ON cm.id = cl.module_id
  JOIN course_enrollments ce ON ce.course_id = cm.course_id
  WHERE ce.id = NEW.enrollment_id
  AND cl.is_published = true
  AND cm.is_published = true;
  
  -- Count completed lessons
  SELECT COUNT(*) INTO completed_lessons
  FROM lesson_progress
  WHERE enrollment_id = NEW.enrollment_id
  AND is_completed = true;
  
  -- Calculate percentage
  IF total_lessons > 0 THEN
    new_progress := (completed_lessons * 100) / total_lessons;
  ELSE
    new_progress := 0;
  END IF;
  
  -- Update enrollment
  UPDATE course_enrollments
  SET 
    progress_percentage = new_progress,
    completed_at = CASE 
      WHEN new_progress = 100 THEN NOW() 
      ELSE NULL 
    END
  WHERE id = NEW.enrollment_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to update course progress
DROP TRIGGER IF EXISTS trigger_update_course_progress ON lesson_progress;
CREATE TRIGGER trigger_update_course_progress
AFTER INSERT OR UPDATE ON lesson_progress
FOR EACH ROW
EXECUTE FUNCTION update_course_progress();

-- Trigger to update updated_at on courses
DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on course_modules
DROP TRIGGER IF EXISTS update_course_modules_updated_at ON course_modules;
CREATE TRIGGER update_course_modules_updated_at
BEFORE UPDATE ON course_modules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on course_lessons
DROP TRIGGER IF EXISTS update_course_lessons_updated_at ON course_lessons;
CREATE TRIGGER update_course_lessons_updated_at
BEFORE UPDATE ON course_lessons
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on lesson_progress
DROP TRIGGER IF EXISTS update_lesson_progress_updated_at ON lesson_progress;
CREATE TRIGGER update_lesson_progress_updated_at
BEFORE UPDATE ON lesson_progress
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();