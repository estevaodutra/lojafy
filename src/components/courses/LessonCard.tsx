import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, CheckCircle, Clock } from 'lucide-react';
import { CourseLesson } from '@/types/courses';

interface LessonCardProps {
  lesson: CourseLesson;
  isCompleted?: boolean;
}

export const LessonCard = ({ lesson, isCompleted = false }: LessonCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
        {lesson.thumbnail_url ? (
          <img 
            src={lesson.thumbnail_url} 
            alt={lesson.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <PlayCircle className="h-16 w-16 text-muted-foreground" />
        )}
        {isCompleted && (
          <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
        )}
      </div>
      
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xl">{lesson.title}</CardTitle>
          <Badge variant={isCompleted ? "default" : "secondary"} className="shrink-0">
            {isCompleted ? '✓ Concluída' : 'Não iniciada'}
          </Badge>
        </div>
        {lesson.description && (
          <CardDescription className="line-clamp-2">
            {lesson.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between">
          {lesson.duration_minutes && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{lesson.duration_minutes} min</span>
            </div>
          )}
          <Button asChild className="ml-auto">
            <Link to={`/minha-conta/aula/${lesson.id}`}>
              {isCompleted ? 'Revisar Aula' : 'Assistir Aula'}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
