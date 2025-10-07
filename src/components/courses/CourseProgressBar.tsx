import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface CourseProgressBarProps {
  progress: number;
  variant?: 'default' | 'success' | 'warning';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const CourseProgressBar = ({ 
  progress, 
  variant = 'default', 
  showLabel = true,
  size = 'md' 
}: CourseProgressBarProps) => {
  const heightClass = size === 'sm' ? 'h-2' : size === 'lg' ? 'h-4' : 'h-3';
  
  const colorClass = variant === 'success' 
    ? 'bg-green-500' 
    : variant === 'warning' 
    ? 'bg-yellow-500' 
    : 'bg-primary';

  return (
    <div className="w-full space-y-1">
      <Progress 
        value={progress} 
        className={cn(heightClass, 'bg-secondary')}
      />
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progress}% concluído</span>
          {progress === 100 && <span className="text-green-600 font-semibold">✓ Completo</span>}
        </div>
      )}
    </div>
  );
};
