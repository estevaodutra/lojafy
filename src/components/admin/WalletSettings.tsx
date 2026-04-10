import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Wallet, Save, Loader2 } from "lucide-react";

const WalletSettings = () => {
  const { settings, isLoading } = usePlatformSettings();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [valorMinimo, setValorMinimo] = useState("100");
  const [valorMaximo, setValorMaximo] = useState("5000");
  const [taxaPercentual, setTaxaPercentual] = useState("5.5");
  const [valoresSugeridos, setValoresSugeridos] = useState("100,200,300,500");
  const [pagamentoParcial, setPagamentoParcial] = useState(false);

  useEffect(() => {
    if (settings) {
      const s = settings as any;
      setValorMinimo(String(s.carteira_valor_minimo ?? 100));
      setValorMaximo(String(s.carteira_valor_maximo ?? 5000));
      setTaxaPercentual(String(s.carteira_taxa_percentual ?? 5.5));
      const sugeridos = s.carteira_valores_sugeridos ?? [100, 200, 300, 500];
      setValoresSugeridos(Array.isArray(sugeridos) ? sugeridos.join(",") : "100,200,300,500");
      setPagamentoParcial(s.carteira_pagamento_parcial ?? false);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const sugeridosArray = valoresSugeridos
        .split(",")
        .map((v) => parseFloat(v.trim()))
        .filter((v) => !isNaN(v) && v > 0);

      const { error } = await supabase
        .from("platform_settings")
        .update({
          carteira_valor_minimo: parseFloat(valorMinimo),
          carteira_valor_maximo: parseFloat(valorMaximo),
          carteira_taxa_percentual: parseFloat(taxaPercentual),
          carteira_valores_sugeridos: sugeridosArray,
          carteira_pagamento_parcial: pagamentoParcial,
        } as any)
        .eq("id", settings?.id);

      if (error) throw error;

      toast({ title: "Configurações da carteira salvas!" });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Configurações da Carteira
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Valor Mínimo de Recarga (R$)</Label>
            <Input type="number" step="0.01" value={valorMinimo} onChange={(e) => setValorMinimo(e.target.value)} />
          </div>
          <div>
            <Label>Valor Máximo de Recarga (R$)</Label>
            <Input type="number" step="0.01" value={valorMaximo} onChange={(e) => setValorMaximo(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Taxa de Recarga (%)</Label>
          <Input type="number" step="0.01" value={taxaPercentual} onChange={(e) => setTaxaPercentual(e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">
            Percentual acrescido ao valor da recarga. Ex: 5.5% sobre R$100 = R$5,50 de taxa.
          </p>
        </div>

        <div>
          <Label>Valores Sugeridos (separados por vírgula)</Label>
          <Input value={valoresSugeridos} onChange={(e) => setValoresSugeridos(e.target.value)} placeholder="100,200,300,500" />
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={pagamentoParcial} onCheckedChange={setPagamentoParcial} />
          <Label>Permitir pagamento parcial (saldo + PIX)</Label>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
};

export default WalletSettings;
