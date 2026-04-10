/**
 * Shipping Cutoff Time Logic
 * Calculates estimated shipping date based on payment time and configurable cutoff.
 * All calculations use America/Sao_Paulo timezone.
 */

const TIMEZONE = 'America/Sao_Paulo';

function getBrasiliaDate(date: Date = new Date()): Date {
  const str = date.toLocaleString('en-US', { timeZone: TIMEZONE });
  return new Date(str);
}

function parseHorarioCorte(horario: string): { hora: number; minuto: number } {
  const [h, m] = horario.split(':').map(Number);
  return { hora: h || 11, minuto: m || 0 };
}

function isDiaEnvio(diaSemana: number, diasEnvio: number[]): boolean {
  return diasEnvio.includes(diaSemana === 0 ? 7 : diaSemana);
}

function proximoDiaUtil(date: Date, diasEnvio: number[]): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  while (!isDiaEnvio(next.getDay(), diasEnvio)) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

export interface ShippingEstimate {
  data_envio: Date;
  envio_mesmo_dia: boolean;
}

export function calcularDataEnvio(
  dataHoraPagamento: Date,
  horarioCorte: string = '11:00',
  diasEnvio: number[] = [1, 2, 3, 4, 5]
): ShippingEstimate {
  const brasilia = getBrasiliaDate(dataHoraPagamento);
  const { hora: corteHora, minuto: corteMinuto } = parseHorarioCorte(horarioCorte);
  
  const horaAtual = brasilia.getHours();
  const minutoAtual = brasilia.getMinutes();
  const diaSemana = brasilia.getDay();
  
  const antesDoCorte = horaAtual < corteHora || (horaAtual === corteHora && minutoAtual < corteMinuto);
  const ehDiaEnvio = isDiaEnvio(diaSemana, diasEnvio);
  
  if (antesDoCorte && ehDiaEnvio) {
    return { data_envio: brasilia, envio_mesmo_dia: true };
  }
  
  return { data_envio: proximoDiaUtil(brasilia, diasEnvio), envio_mesmo_dia: false };
}

export interface MensagemEnvio {
  tipo: 'hoje' | 'proximo';
  titulo: string;
  subtitulo: string;
}

function getNomeDia(date: Date): string {
  const dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  return dias[date.getDay()];
}

export function getMensagemEnvio(
  horarioCorte: string = '11:00',
  diasEnvio: number[] = [1, 2, 3, 4, 5]
): MensagemEnvio {
  const agora = getBrasiliaDate();
  const { hora: corteHora, minuto: corteMinuto } = parseHorarioCorte(horarioCorte);
  
  const hora = agora.getHours();
  const minutos = agora.getMinutes();
  const diaSemana = agora.getDay();
  
  const ehDiaEnvio = isDiaEnvio(diaSemana, diasEnvio);
  const antesDoCorte = hora < corteHora || (hora === corteHora && minutos < corteMinuto);
  
  if (ehDiaEnvio && antesDoCorte) {
    const minutosRestantes = (corteHora * 60 + corteMinuto) - (hora * 60 + minutos);
    const horasRestantes = Math.floor(minutosRestantes / 60);
    const minsRestantes = minutosRestantes % 60;
    
    let countdown = '';
    if (horasRestantes > 0) {
      countdown = `${horasRestantes}h${minsRestantes > 0 ? ` e ${minsRestantes}min` : ''}`;
    } else {
      countdown = `${minsRestantes}min`;
    }
    
    return {
      tipo: 'hoje',
      titulo: '🚀 Pague agora e seu pedido será enviado HOJE!',
      subtitulo: `Você tem ${countdown} para garantir envio hoje.`
    };
  }
  
  // Find next shipping day
  const proximo = proximoDiaUtil(agora, diasEnvio);
  const nomeDia = getNomeDia(proximo);
  
  // Check if it's tomorrow
  const amanha = new Date(agora);
  amanha.setDate(amanha.getDate() + 1);
  const ehAmanha = proximo.getDate() === amanha.getDate() && 
                   proximo.getMonth() === amanha.getMonth();
  
  if (ehAmanha) {
    return {
      tipo: 'proximo',
      titulo: '📦 Seu pedido será enviado amanhã',
      subtitulo: `Pedidos pagos após ${horarioCorte} são enviados no próximo dia útil.`
    };
  }
  
  return {
    tipo: 'proximo',
    titulo: `📦 Seu pedido será enviado na ${nomeDia}`,
    subtitulo: `Pedidos pagos fora do horário de envio são enviados no próximo dia útil.`
  };
}
