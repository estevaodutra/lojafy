import { cn } from '@/lib/utils';
import { Check, PlayCircle, Lock } from 'lucide-react';
import { CourseLesson } from '@/types/courses';

interface LessonItemProps {
  lesson: CourseLesson;
  isCompleted?: boolean;
  isActive?: boolean;
  isLocked?: boolean;
  onClick?: () => void;
  showDuration?: boolean;
}

export const LessonItem = ({ 
  lesson, 
  isCompleted = false, 
  isActive = false,
  isLocked = false,
  onClick,
  showDuration = true 
}: LessonItemProps) => {
  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
        isActive && 'bg-primary/10 border-l-4 border-primary',
        !isActive && !isLocked && 'hover:bg-accent',
        isLocked && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex-shrink-0">
        {isLocked ? (
          <Lock className="w-5 h-5 text-muted-foreground" />
        ) : isCompleted ? (
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        ) : (
          <PlayCircle className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium truncate',
          isActive && 'text-primary',
          isCompleted && 'text-muted-foreground'
        )}>
          {lesson.title}
        </p>
        {showDuration && lesson.duration_minutes && (
          <p className="text-xs text-muted-foreground">
            {formatDuration(lesson.duration_minutes)}
          </p>
        )}
      </div>
    </button>
  );
};
