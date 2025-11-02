import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';
import { CourseModule } from '@/types/courses';

interface ModuleCardProps {
  module: CourseModule;
  courseId: string;
}

export const ModuleCard = ({ module, courseId }: ModuleCardProps) => {
  const lessonCount = module.lessons?.length || 0;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
        {module.thumbnail_url ? (
          <img 
            src={module.thumbnail_url} 
            alt={module.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <BookOpen className="h-16 w-16 text-muted-foreground" />
        )}
      </div>
      
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xl">{module.title}</CardTitle>
          {module.is_published && (
            <Badge variant="secondary" className="shrink-0">Publicado</Badge>
          )}
        </div>
        {module.description && (
          <CardDescription className="line-clamp-2">
            {module.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {lessonCount} {lessonCount === 1 ? 'aula' : 'aulas'}
          </span>
          <Button asChild>
            <Link to={`/minha-conta/curso/${courseId}/modulo/${module.id}`}>
              Acessar Módulo
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
