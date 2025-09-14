import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Eye, Mail, Gift } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NewsletterConfig = () => {
  const [config, setConfig] = useState({
    title: "",
    subtitle: "",
    description: "",
    email_placeholder: "",
    button_text: "",
    button_color: "primary",
    icon_name: "Gift",
    background_color: "",
    custom_image_url: "",
    privacy_text: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: newsletterConfig, isLoading } = useQuery({
    queryKey: ["admin-newsletter-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_config")
        .select("*")
        .eq("active", true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  useEffect(() => {
    if (newsletterConfig) {
      setConfig({
        title: newsletterConfig.title || "",
        subtitle: newsletterConfig.subtitle || "",
        description: newsletterConfig.description || "",
        email_placeholder: newsletterConfig.email_placeholder || "",
        button_text: newsletterConfig.button_text || "",
        button_color: newsletterConfig.button_color || "primary",
        icon_name: newsletterConfig.icon_name || "Gift",
        background_color: newsletterConfig.background_color || "",
        custom_image_url: newsletterConfig.custom_image_url || "",
        privacy_text: newsletterConfig.privacy_text || ""
      });
    }
  }, [newsletterConfig]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (newsletterConfig) {
        // Update existing config
        const { error } = await supabase
          .from("newsletter_config")
          .update(data)
          .eq("id", newsletterConfig.id);

        if (error) throw error;
      } else {
        // Create new config
        const { error } = await supabase
          .from("newsletter_config")
          .insert({ ...data, active: true });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-newsletter-config"] });
      toast({ title: "Configuração salva com sucesso!" });
    },
    onError: () => {
      toast({
        title: "Erro ao salvar configuração",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(config);
  };

  const handleInputChange = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const iconOptions = [
    { value: "Gift", label: "Presente (Gift)" },
    { value: "Mail", label: "Email (Mail)" },
    { value: "Star", label: "Estrela (Star)" },
    { value: "Heart", label: "Coração (Heart)" },
    { value: "Bell", label: "Sino (Bell)" },
    { value: "Zap", label: "Raio (Zap)" },
    { value: "Tag", label: "Tag (Tag)" },
    { value: "Percent", label: "Porcentagem (Percent)" }
  ];

  const colorOptions = [
    { value: "primary", label: "Primária" },
    { value: "secondary", label: "Secundária" },
    { value: "destructive", label: "Vermelha" },
    { value: "outline", label: "Contorno" }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Configurar Newsletter/CTA
          </h1>
          <p className="text-muted-foreground">
            Personalizar a seção de newsletter da homepage
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.open("/", "_blank")}
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          Visualizar Homepage
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Configurações
            </CardTitle>
            <CardDescription>
              Configure os textos e aparência da seção de newsletter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Título Principal *</Label>
                <Input
                  id="title"
                  value={config.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Ex: Ofertas Exclusivas"
                  required
                />
              </div>

              <div>
                <Label htmlFor="subtitle">Subtítulo</Label>
                <Input
                  id="subtitle"
                  value={config.subtitle}
                  onChange={(e) => handleInputChange("subtitle", e.target.value)}
                  placeholder="Ex: Receba ofertas especiais em primeira mão!"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={config.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Ex: Cadastre-se e seja o primeiro a saber sobre nossas promoções."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="email-placeholder">Placeholder do Email *</Label>
                <Input
                  id="email-placeholder"
                  value={config.email_placeholder}
                  onChange={(e) => handleInputChange("email_placeholder", e.target.value)}
                  placeholder="Ex: Seu melhor e-mail"
                  required
                />
              </div>

              <div>
                <Label htmlFor="button-text">Texto do Botão *</Label>
                <Input
                  id="button-text"
                  value={config.button_text}
                  onChange={(e) => handleInputChange("button_text", e.target.value)}
                  placeholder="Ex: Quero receber ofertas"
                  required
                />
              </div>

              <div>
                <Label htmlFor="button-color">Cor do Botão</Label>
                <Select 
                  value={config.button_color} 
                  onValueChange={(value) => handleInputChange("button_color", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="icon-name">Ícone</Label>
                <Select 
                  value={config.icon_name} 
                  onValueChange={(value) => handleInputChange("icon_name", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="custom-image-url">URL da Imagem Personalizada</Label>
                <Input
                  id="custom-image-url"
                  value={config.custom_image_url}
                  onChange={(e) => handleInputChange("custom_image_url", e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                  type="url"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Se fornecida, substitui o ícone
                </p>
              </div>

              <div>
                <Label htmlFor="background-color">Cor de Fundo</Label>
                <Input
                  id="background-color"
                  value={config.background_color}
                  onChange={(e) => handleInputChange("background_color", e.target.value)}
                  placeholder="Ex: #f0f0f0 ou classe Tailwind"
                />
              </div>

              <div>
                <Label htmlFor="privacy-text">Texto de Privacidade</Label>
                <Input
                  id="privacy-text"
                  value={config.privacy_text}
                  onChange={(e) => handleInputChange("privacy_text", e.target.value)}
                  placeholder="Ex: Não compartilhamos seus dados."
                />
              </div>

              <Button type="submit" className="w-full gap-2">
                <Save className="h-4 w-4" />
                Salvar Configurações
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Visualização aproximada de como ficará na homepage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-background">
              <div className="grid grid-cols-1 gap-6 items-center">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Gift className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-bold text-foreground">
                      {config.title || "Título Principal"}
                    </h3>
                  </div>
                  {config.subtitle && (
                    <p className="text-sm text-muted-foreground">
                      {config.subtitle}
                    </p>
                  )}
                  {config.description && (
                    <p className="text-xs text-muted-foreground">
                      {config.description}
                    </p>
                  )}
                  {config.privacy_text && (
                    <p className="text-xs text-muted-foreground">
                      {config.privacy_text}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Input
                    placeholder={config.email_placeholder || "Placeholder do email"}
                    disabled
                    className="text-sm"
                  />
                  <Button 
                    className="w-full text-sm" 
                    disabled
                  >
                    {config.button_text || "Texto do botão"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Nota:</strong> Esta é uma visualização aproximada. 
                O resultado final pode ter pequenas diferenças de estilo.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewsletterConfig;