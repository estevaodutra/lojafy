import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface DemoDataToggleProps {
  useDemo: boolean;
  onToggle: (useDemo: boolean) => void;
}

export const DemoDataToggle = ({ useDemo, onToggle }: DemoDataToggleProps) => {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Label htmlFor="demo-toggle" className="text-sm font-medium">
              Modo de Dados
            </Label>
            {useDemo && (
              <div className="flex items-center space-x-1 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs">Demo</span>
              </div>
            )}
          </div>
          <Switch
            id="demo-toggle"
            checked={useDemo}
            onCheckedChange={onToggle}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground">
          {useDemo 
            ? "Exibindo dados de demonstração com produtos de markup 50% e margem 35%" 
            : "Exibindo dados reais de vendas da loja"
          }
        </p>
      </CardContent>
    </Card>
  );
};