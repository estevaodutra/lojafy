import { useState, useEffect } from "react";
import { getMensagemEnvio, MensagemEnvio } from "@/lib/shippingCutoff";
import { supabase } from "@/integrations/supabase/client";

const BannerPrevisaoEnvio = () => {
  const [mensagem, setMensagem] = useState<MensagemEnvio | null>(null);
  const [horarioCorte, setHorarioCorte] = useState('11:00');
  const [diasEnvio, setDiasEnvio] = useState<number[]>([1, 2, 3, 4, 5]);

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('horario_corte_envio, dias_envio')
        .single();
      
      if (data) {
        if (data.horario_corte_envio) {
          setHorarioCorte(data.horario_corte_envio);
        }
        if (data.dias_envio) {
          setDiasEnvio(data.dias_envio as unknown as number[]);
        }
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    const atualizar = () => setMensagem(getMensagemEnvio(horarioCorte, diasEnvio));
    atualizar();
    const interval = setInterval(atualizar, 60000);
    return () => clearInterval(interval);
  }, [horarioCorte, diasEnvio]);

  if (!mensagem) return null;

  const isHoje = mensagem.tipo === 'hoje';

  return (
    <div
      className={`rounded-lg p-4 border mb-4 ${
        isHoje
          ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-400 dark:from-emerald-950/30 dark:to-green-950/30 dark:border-emerald-600'
          : 'bg-amber-50 border-amber-400 dark:bg-amber-950/30 dark:border-amber-600'
      }`}
    >
      <p className={`font-semibold text-sm ${
        isHoje ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'
      }`}>
        {mensagem.titulo}
      </p>
      <p className={`text-xs mt-1 ${
        isHoje ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
      }`}>
        {mensagem.subtitulo}
      </p>
    </div>
  );
};

export default BannerPrevisaoEnvio;
