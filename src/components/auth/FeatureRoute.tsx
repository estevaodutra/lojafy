import React from 'react';
import { useFeature } from '@/hooks/useFeature';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FeatureRouteProps {
  feature: string;
  children: React.ReactNode;
}

export const FeatureRoute: React.FC<FeatureRouteProps> = ({
  feature,
  children,
}) => {
  const { hasFeature, isLoading } = useFeature(feature);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!hasFeature) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Recurso Bloqueado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Você não tem acesso a este recurso. Entre em contato com o
              administrador para solicitar acesso.
            </p>
            <Button onClick={() => navigate(-1)} variant="outline">
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
