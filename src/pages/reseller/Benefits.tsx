import { useState, useEffect } from "react";
import { useResellerStore } from "@/hooks/useResellerStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconSelector } from "@/components/admin/IconSelector";
import { ColorPicker } from "@/components/admin/ColorPicker";
import { Trash2, Plus, ChevronUp, ChevronDown, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Truck,
  Shield,
  RefreshCw,
  CreditCard,
  Gift,
  Award,
  Star,
  Heart,
  Package,
  Clock,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Tag,
  TrendingUp,
  Zap,
  ShoppingBag,
  BadgeCheck,
  Sparkles,
  LucideIcon
} from "lucide-react";

interface Benefit {
  id: string;
  icon: string;
  color: string;
  title: string;
  active: boolean;
  position: number;
  description: string;
}

const iconMap: { [key: string]: LucideIcon } = {
  Truck,
  Shield,
  RefreshCw,
  CreditCard,
  Gift,
  Award,
  Star,
  Heart,
  Package,
  Clock,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Tag,
  TrendingUp,
  Zap,
  ShoppingBag,
  BadgeCheck,
  Sparkles,
};

const ResellerBenefits = () => {
  const { store, updateBenefitsConfig, isLoading } = useResellerStore();
  const { toast } = useToast();
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (store?.benefits_config) {
      setBenefits(store.benefits_config as Benefit[]);
    }
  }, [store]);

  const handleAddBenefit = () => {
    if (benefits.length >= 8) {
      toast({
        title: "Limite atingido",
        description: "Você pode ter no máximo 8 vantagens.",
        variant: "destructive",
      });
      return;
    }

    const newBenefit: Benefit = {
      id: `benefit-${Date.now()}`,
      icon: "Star",
      color: "#3b82f6",
      title: "Nova Vantagem",
      description: "Descreva sua vantagem",
      active: true,
      position: benefits.length + 1,
    };

    setBenefits([...benefits, newBenefit]);
    setHasChanges(true);
  };

  const handleRemoveBenefit = (id: string) => {
    if (benefits.filter(b => b.active).length <= 1) {
      toast({
        title: "Operação não permitida",
        description: "Você deve ter pelo menos 1 vantagem ativa.",
        variant: "destructive",
      });
      return;
    }

    const updatedBenefits = benefits
      .filter(b => b.id !== id)
      .map((b, idx) => ({ ...b, position: idx + 1 }));
    
    setBenefits(updatedBenefits);
    setHasChanges(true);
  };

  const handleUpdateBenefit = (id: string, field: keyof Benefit, value: any) => {
    const updatedBenefits = benefits.map(b =>
      b.id === id ? { ...b, [field]: value } : b
    );
    setBenefits(updatedBenefits);
    setHasChanges(true);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    
    const updatedBenefits = [...benefits];
    [updatedBenefits[index], updatedBenefits[index - 1]] = 
    [updatedBenefits[index - 1], updatedBenefits[index]];
    
    updatedBenefits.forEach((b, idx) => b.position = idx + 1);
    setBenefits(updatedBenefits);
    setHasChanges(true);
  };

  const handleMoveDown = (index: number) => {
    if (index === benefits.length - 1) return;
    
    const updatedBenefits = [...benefits];
    [updatedBenefits[index], updatedBenefits[index + 1]] = 
    [updatedBenefits[index + 1], updatedBenefits[index]];
    
    updatedBenefits.forEach((b, idx) => b.position = idx + 1);
    setBenefits(updatedBenefits);
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Validation
    const activeBenefits = benefits.filter(b => b.active);
    if (activeBenefits.length < 1) {
      toast({
        title: "Validação falhou",
        description: "Você deve ter pelo menos 1 vantagem ativa.",
        variant: "destructive",
      });
      return;
    }

    const hasEmptyTitle = benefits.some(b => !b.title.trim());
    if (hasEmptyTitle) {
      toast({
        title: "Validação falhou",
        description: "Todos os títulos devem estar preenchidos.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateBenefitsConfig(benefits);
      setHasChanges(false);
      toast({
        title: "Sucesso!",
        description: "Vantagens atualizadas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Vantagens da Loja</h1>
          <p className="text-muted-foreground mt-1">
            Configure as vantagens que aparecerão na sua loja pública
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleAddBenefit}
            variant="outline"
            disabled={benefits.length >= 8}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Vantagem
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
          >
            <Save className="mr-2 h-4 w-4" />
            Salvar Alterações
          </Button>
        </div>
      </div>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            Veja como as vantagens aparecerão na sua loja
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.filter(b => b.active).map((benefit) => {
              const IconComponent = iconMap[benefit.icon] || Star;
              return (
                <div
                  key={benefit.id}
                  className="p-4 border rounded-lg bg-card hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <IconComponent
                      className="h-10 w-10 flex-shrink-0"
                      style={{ color: benefit.color }}
                    />
                    <div>
                      <h3 className="font-bold text-sm">{benefit.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Benefits Editor */}
      <div className="space-y-4">
        {benefits.map((benefit, index) => {
          const IconComponent = iconMap[benefit.icon] || Star;
          
          return (
            <Card key={benefit.id}>
              <CardContent className="pt-6">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <IconComponent
                        className="h-8 w-8"
                        style={{ color: benefit.color }}
                      />
                      <div>
                        <Label className="font-semibold">
                          Vantagem #{benefit.position}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {benefit.active ? "Ativa" : "Inativa"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === benefits.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`active-${benefit.id}`}>Ativo</Label>
                        <Switch
                          id={`active-${benefit.id}`}
                          checked={benefit.active}
                          onCheckedChange={(checked) =>
                            handleUpdateBenefit(benefit.id, "active", checked)
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveBenefit(benefit.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`title-${benefit.id}`}>Título</Label>
                      <Input
                        id={`title-${benefit.id}`}
                        value={benefit.title}
                        onChange={(e) =>
                          handleUpdateBenefit(benefit.id, "title", e.target.value)
                        }
                        placeholder="Ex: Frete Grátis"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`description-${benefit.id}`}>Descrição</Label>
                      <Input
                        id={`description-${benefit.id}`}
                        value={benefit.description}
                        onChange={(e) =>
                          handleUpdateBenefit(benefit.id, "description", e.target.value)
                        }
                        placeholder="Ex: Acima de R$ 199"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ícone</Label>
                      <IconSelector
                        value={benefit.icon}
                        onChange={(icon) =>
                          handleUpdateBenefit(benefit.id, "icon", icon)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Cor</Label>
                      <ColorPicker
                        color={benefit.color}
                        onChange={(color) =>
                          handleUpdateBenefit(benefit.id, "color", color)
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {benefits.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhuma vantagem cadastrada ainda.
            </p>
            <Button onClick={handleAddBenefit}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeira Vantagem
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ResellerBenefits;
