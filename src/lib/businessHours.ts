export interface BusinessHoursStatus {
  isOpen: boolean;
  message: string;
  nextOpenTime?: string;
}

export function isWithinBusinessHours(): BusinessHoursStatus {
  const now = new Date();
  const day = now.getDay(); // 0 = Domingo, 1-5 = Seg-Sex, 6 = Sábado
  const hour = now.getHours();
  
  // Segunda a sexta (1-5)
  const isWeekday = day >= 1 && day <= 5;
  // Entre 9h e 16h
  const isBusinessHour = hour >= 9 && hour < 16;
  
  if (!isWeekday) {
    return {
      isOpen: false,
      message: '⏰ Nosso atendimento humano funciona de segunda a sexta, das 9h às 16h. Mas você pode continuar conversando com nossa IA!',
      nextOpenTime: 'Segunda-feira às 9h'
    };
  }
  
  if (!isBusinessHour) {
    if (hour < 9) {
      return {
        isOpen: false,
        message: '⏰ Nosso atendimento humano inicia às 9h. Mas você pode continuar conversando com nossa IA!',
        nextOpenTime: 'Hoje às 9h'
      };
    } else {
      return {
        isOpen: false,
        message: '⏰ Nosso atendimento humano encerra às 16h. Retornaremos amanhã às 9h. Mas você pode continuar conversando com nossa IA!',
        nextOpenTime: 'Amanhã às 9h'
      };
    }
  }
  
  return { 
    isOpen: true, 
    message: '✅ Atendimento humano disponível (Seg-Sex, 9h-16h)' 
  };
}

export function getBusinessHoursForCustomer(): string {
  return 'Segunda a Sexta, das 9h às 16h';
}
