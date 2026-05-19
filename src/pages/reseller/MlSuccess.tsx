import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ShoppingBag, ArrowRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const REDIRECT_SECONDS = 8;

const MlSuccess = () => {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);
  const [mlUserId, setMlUserId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("mercadolivre_integrations")
        .select("ml_user_id, expires_at")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single()
        .then(({ data }) => {
          if (data) {
            setMlUserId(String(data.ml_user_id));
            setExpiresAt(data.expires_at ?? null);
          }
        });
    });
  }, []);

  useEffect(() => {
    if (seconds <= 0) {
      navigate("/reseller/integracoes");
      return;
    }
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds, navigate]);

  const progress = ((REDIRECT_SECONDS - seconds) / REDIRECT_SECONDS) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-white p-4">
      <Card className="w-full max-w-md shadow-lg border-yellow-200">
        <CardContent className="pt-10 pb-8 flex flex-col items-center text-center gap-6">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-30" />
            <div className="relative rounded-full bg-green-100 p-5">
              <CheckCircle2 className="h-14 w-14 text-green-600" strokeWidth={1.5} />
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 border border-yellow-300">
            <ShoppingBag className="h-5 w-5 text-yellow-600" />
            <span className="font-semibold text-yellow-800 text-sm">Mercado Livre</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Integração Realizada com Sucesso!
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Sua conta do Mercado Livre foi conectada à Lojafy. Agora você pode publicar
              seus produtos diretamente no marketplace.
            </p>
          </div>

          {mlUserId && (
            <div className="w-full rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-yellow-600 shrink-0" />
                <span className="text-gray-700">
                  Conta ML conectada: <span className="font-mono font-semibold">#{mlUserId}</span>
                </span>
              </div>
              {expiresAt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
                  <span>
                    Token válido até {format(new Date(expiresAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="w-full rounded-lg bg-muted/50 p-4 text-left space-y-2">
            {[
              "Publique produtos com 1 clique",
              "Receba pedidos automaticamente",
              "Sincronização de estoque em tempo real",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <Button className="w-full gap-2" onClick={() => navigate("/reseller/integracoes")}>
            Ir para Integrações
            <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="w-full space-y-1">
            <Progress value={progress} className="h-1" />
            <p className="text-xs text-muted-foreground">
              Redirecionando automaticamente em {seconds}s…
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MlSuccess;
