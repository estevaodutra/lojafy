export interface Course {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  instructor_name?: string;
  duration_hours?: number;
  level?: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  is_published: boolean;
  position: number;
  access_level: 'all' | 'customer' | 'supplier' | 'reseller';
  created_at: string;
  updated_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  position: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  lessons?: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  module_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  content?: string;
  video_url?: string;
  duration_minutes?: number;
  position: number;
  is_published: boolean;
  attachments: LessonAttachment[];
  created_at: string;
  updated_at: string;
}

export interface LessonAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface CourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  expires_at?: string;
  progress_percentage: number;
  completed_at?: string;
  course?: Course;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  enrollment_id: string;
  is_completed: boolean;
  completed_at?: string;
  watch_time_seconds: number;
  last_position_seconds: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}
