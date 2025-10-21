import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MessageDateSeparatorProps {
  date: Date;
}

export const MessageDateSeparator = ({ date }: MessageDateSeparatorProps) => {
  const getDateLabel = () => {
    if (isToday(date)) {
      return 'hoje';
    }
    if (isYesterday(date)) {
      return 'ontem';
    }
    if (isThisWeek(date)) {
      return format(date, 'EEEE', { locale: ptBR });
    }
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-muted px-3 py-1 rounded-full">
        <span className="text-xs text-muted-foreground font-medium">
          {getDateLabel()}
        </span>
      </div>
    </div>
  );
};
