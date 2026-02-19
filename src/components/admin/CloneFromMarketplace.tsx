import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Loader2, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CloneFromMarketplaceProps {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    cost_price?: number;
    images: string[];
    attributes?: any[];
    sku?: string;
    gtin_ean13?: string;
    category_id?: string;
    subcategory_id?: string;
    stock_quantity?: number;
  };
  onCloneSuccess?: (updatedProduct?: any) => void;
}

const MARKETPLACES = [
  { value: "mercadolivre", label: "Mercado Livre", placeholder: "https://produto.mercadolivre.com.br/MLB-..." },
  { value: "amazon", label: "Amazon", placeholder: "https://www.amazon.com.br/dp/..." },
  { value: "shopee", label: "Shopee", placeholder: "https://shopee.com.br/..." },
  { value: "magalu", label: "Magazine Luiza", placeholder: "https://www.magazineluiza.com.br/..." },
];

const URL_PATTERNS: Record<string, RegExp> = {
  mercadolivre: /^https?:\/\/(www\.)?(produto\.)?mercadolivre\.com\.br\//,
  amazon: /^https?:\/\/(www\.)?amazon\.com\.br\//,
  shopee: /^https?:\/\/(www\.)?shopee\.com\.br\//,
  magalu: /^https?:\/\/(www\.)?magazineluiza\.com\.br\//,
};

export function CloneFromMarketplace({ product, onCloneSuccess }: CloneFromMarketplaceProps) {
  const { user } = useAuth();
  const [marketplace, setMarketplace] = useState("");
  const [advertiseUrl, setAdvertiseUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [waitForResponse, setWaitForResponse] = useState(true);
  const [cloneResult, setCloneResult] = useState<{ success: boolean; message: string } | null>(null);

  const selectedMarketplace = MARKETPLACES.find(m => m.value === marketplace);

  const validateUrl = (url: string, mp: string): boolean => {
    if (!url || !mp) return false;
    return URL_PATTERNS[mp]?.test(url) || false;
  };

  const getMarketplaceIntegration = async () => {
    if (!user?.id) return null;

    // Por enquanto só ML tem integração
    if (marketplace !== "mercadolivre") return null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error("Sessão não encontrada");
        return null;
      }

      const { data, error } = await supabase.functions.invoke("get-ml-integration", {
        body: { user_id: "b21170cb-2872-45df-b31b-bf977d93dc14" },
      });

      if (error) {
        console.error("Erro ao buscar integração via edge function:", error);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Erro ao buscar integração:", err);
      return null;
    }
  };

  const handleClone = async () => {
    setCloneResult(null);

    if (!marketplace) {
      toast.error("Selecione um marketplace");
      return;
    }
    if (!advertiseUrl) {
      toast.error("Informe o link do anúncio");
      return;
    }
    if (!validateUrl(advertiseUrl, marketplace)) {
      toast.error(`Link inválido para ${selectedMarketplace?.label}`);
      return;
    }
    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    setIsLoading(true);

    try {
      // Buscar token de integração (só ML por enquanto)
      const integration = await getMarketplaceIntegration();

      // Token de integração é opcional - webhook pode buscar dados públicos

      const payload = {
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          cost_price: product.cost_price,
          images: product.images,
          attributes: product.attributes,
          sku: product.sku,
          gtin_ean13: product.gtin_ean13,
          category_id: product.category_id,
          subcategory_id: product.subcategory_id,
          stock_quantity: product.stock_quantity,
        },
        clone_from: {
          marketplace,
          url: advertiseUrl,
        },
        integration: integration
          ? {
              access_token: integration.access_token,
              refresh_token: integration.refresh_token,
              ml_user_id: integration.ml_user_id,
              expires_at: integration.expires_at,
            }
          : null,
        user_id: user.id,
        user_email: "katana.qualidade_0a@icloud.com",
        wait_for_response: waitForResponse,
        requested_at: new Date().toISOString(),
      };

      const response = await fetch(
        "https://n8n-n8n.nuwfic.easypanel.host/webhook/clone_advertise",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao enviar para processamento");
      }

      if (waitForResponse) {
        const result = await response.json();

        // Resposta vem como array - extrair primeiro item
        const item = Array.isArray(result) ? result[0] : result;
        const isSuccess = item?.success === true;
        const productData = item?.data || item?.product;

        if (isSuccess) {
          setCloneResult({ success: true, message: "Produto clonado com sucesso!" });
          toast.success("Produto clonado com sucesso!", { description: "Os dados foram atualizados." });
          onCloneSuccess?.(productData);
        } else {
          const errorMsg = item?.error || item?.message || "Erro ao clonar produto";
          setCloneResult({ success: false, message: errorMsg });
          toast.error("Erro ao clonar produto", { description: errorMsg });
        }
      } else {
        toast.success("Produto enviado para clonagem!", { description: "O produto será atualizado em alguns instantes." });
        onCloneSuccess?.();
      }

      setMarketplace("");
      setAdvertiseUrl("");
    } catch (error) {
      console.error("Erro ao clonar:", error);
      setCloneResult({ success: false, message: "Erro ao processar clonagem" });
      toast.error("Erro ao processar clonagem", { description: "Tente novamente em alguns instantes." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Copy className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Clonar a partir de Marketplace</CardTitle>
        </div>
        <CardDescription>
          Importe os dados de um anúncio existente em outro marketplace para atualizar este produto.
          Útil quando a busca automática não encontra o produto correto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Marketplace Select */}
        <div className="space-y-2">
          <Label>Marketplace</Label>
          <Select value={marketplace} onValueChange={setMarketplace}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o marketplace" />
            </SelectTrigger>
            <SelectContent>
              {MARKETPLACES.map((mp) => (
                <SelectItem key={mp.value} value={mp.value}>
                  {mp.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* URL Input */}
        <div className="space-y-2">
          <Label>Link do Anúncio</Label>
          <div className="flex gap-2">
            <Input
              placeholder={selectedMarketplace?.placeholder || "Cole o link do anúncio aqui"}
              value={advertiseUrl}
              onChange={(e) => setAdvertiseUrl(e.target.value)}
              disabled={!marketplace}
            />
            {advertiseUrl && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(advertiseUrl, "_blank")}
                title="Abrir link"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
          {marketplace && (
            <p className="text-xs text-muted-foreground">
              Exemplo: {selectedMarketplace?.placeholder}
            </p>
          )}
        </div>

        {/* Wait for response checkbox */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="wait-response"
            checked={waitForResponse}
            onCheckedChange={(checked) => setWaitForResponse(checked === true)}
          />
          <Label htmlFor="wait-response" className="text-sm font-normal cursor-pointer">
            Aguardar resposta (ver resultado imediato)
          </Label>
        </div>

        {/* Clone result */}
        {cloneResult && (
          <div
            className={`flex items-center gap-2 p-3 rounded-md text-sm ${
              cloneResult.success
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {cloneResult.success ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            {cloneResult.message}
          </div>
        )}

        {/* Clone button */}
        <Button
          onClick={handleClone}
          disabled={isLoading || !marketplace || !advertiseUrl}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {waitForResponse ? "Clonando..." : "Enviando..."}
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Clonar Dados do Anúncio
            </>
          )}
        </Button>

        {/* Warning */}
        <p className="text-xs text-muted-foreground text-center">
          ⚠️ Os dados atuais do produto serão substituídos pelos dados do anúncio clonado.
        </p>
      </CardContent>
    </Card>
  );
}
