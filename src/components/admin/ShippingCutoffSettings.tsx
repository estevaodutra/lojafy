import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock, Truck } from "lucide-react";

const DIAS_SEMANA = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
];

const ShippingCutoffSettings = () => {
  const { toast } = useToast();
  const [hora, setHora] = useState('11');
  const [minuto, setMinuto] = useState('00');
  const [diasEnvio, setDiasEnvio] = useState<number[]>([1, 2, 3, 4, 5]);
  const [loading, setLoading] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('id, horario_corte_envio, dias_envio')
        .single();

      if (data) {
        setSettingsId(data.id);
        if (data.horario_corte_envio) {
          const parts = String(data.horario_corte_envio).split(':');
          setHora(parts[0] || '11');
          setMinuto(parts[1] || '00');
        }
        if (data.dias_envio) {
          setDiasEnvio(data.dias_envio as unknown as number[]);
        }
      }
    };
    fetch();
  }, []);

  const toggleDia = (dia: number) => {
    setDiasEnvio(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia].sort()
    );
  };

  const handleSave = async () => {
    if (!settingsId) return;
    setLoading(true);
    
    const horarioCorte = `${hora.padStart(2, '0')}:${minuto.padStart(2, '0')}`;
    
    const { error } = await supabase
      .from('platform_settings')
      .update({
        horario_corte_envio: horarioCorte,
        dias_envio: diasEnvio as any
      })
      .eq('id', settingsId);

    setLoading(false);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configurações de envio salvas com sucesso!" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Horário de Corte para Envio
        </CardTitle>
        <CardDescription>
          Pedidos pagos até o horário de corte são enviados no mesmo dia. Após o horário, são enviados no próximo dia útil configurado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Horário de Corte (Brasília)
          </Label>
          <div className="flex items-center gap-2 max-w-xs">
            <Input
              type="number"
              min={0}
              max={23}
              value={hora}
              onChange={e => setHora(e.target.value)}
              className="w-20 text-center"
            />
            <span className="text-lg font-bold">:</span>
            <Input
              type="number"
              min={0}
              max={59}
              value={minuto}
              onChange={e => setMinuto(e.target.value)}
              className="w-20 text-center"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Dias de Envio</Label>
          <div className="flex flex-wrap gap-3">
            {DIAS_SEMANA.map(dia => (
              <label key={dia.value} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={diasEnvio.includes(dia.value)}
                  onCheckedChange={() => toggleDia(dia.value)}
                />
                <span className="text-sm">{dia.label}</span>
              </label>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading || diasEnvio.length === 0}>
          {loading ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ShippingCutoffSettings;
