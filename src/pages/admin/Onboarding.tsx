import { ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Onboarding() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Onboarding</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Área de acompanhamento da ativação dos parceiros.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-lg font-medium">Jornada de onboarding</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Esta área está pronta para receber as etapas, tarefas e integrações da jornada.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
