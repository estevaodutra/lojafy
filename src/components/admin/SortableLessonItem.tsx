import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CourseLesson } from '@/types/courses';

interface SortableLessonItemProps {
  lesson: CourseLesson;
  onEdit: (lesson: CourseLesson) => void;
  onDelete: (id: string) => void;
}

export function SortableLessonItem({ lesson, onEdit, onDelete }: SortableLessonItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 border rounded-lg 
        hover:bg-accent/50 transition-colors bg-background
        ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 mr-2 text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-5 w-5" />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{lesson.title}</span>
          <Badge variant={lesson.is_published ? 'default' : 'secondary'} className="text-xs">
            {lesson.is_published ? 'Publicado' : 'Rascunho'}
          </Badge>
        </div>
        {lesson.description && (
          <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
        )}
        {lesson.duration_minutes && (
          <p className="text-xs text-muted-foreground mt-1">
            Duração: {lesson.duration_minutes} minutos
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => onEdit(lesson)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(lesson.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
