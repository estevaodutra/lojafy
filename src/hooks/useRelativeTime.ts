import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const useRelativeTime = (dateString: string) => {
  const [relativeTime, setRelativeTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      try {
        const date = new Date(dateString);
        const formatted = formatDistanceToNow(date, { 
          addSuffix: true, 
          locale: ptBR 
        });
        setRelativeTime(formatted);
      } catch (error) {
        setRelativeTime('Data inválida');
      }
    };

    updateTime();
    
    // Update every minute
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, [dateString]);

  return relativeTime;
};