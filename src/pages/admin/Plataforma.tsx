import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, Settings, BarChart3, Users, Edit, Loader2 } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { PlatformSettingsForm } from '@/components/admin/PlatformSettingsForm';

const Plataforma = () => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const { settings, isLoading } = usePlatformSettings();

  const formatFeeDisplay = (value: number, type: 'percentage' | 'fixed') => {
    if (type === 'percentage') {
      return `${value}%`;
    }
    return `R$ ${value.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações da Plataforma</h1>
        <p className="text-muted-foreground">
          Gerencie configurações globais da plataforma e sistema
        </p>
      </div>

      <Tabs defaultValue="configuracoes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
          <TabsTrigger value="seguranca">Segurança</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="usuarios">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="configuracoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações Gerais
              </CardTitle>
              <CardDescription>
                Configurações básicas da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Taxas da Plataforma</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure as taxas cobradas pela plataforma
                    </p>
                  </div>
                  <Button 
                    onClick={() => setIsSettingsModalOpen(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editar Taxas
                  </Button>
                </div>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-muted-foreground">Carregando configurações...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium">Taxa de Transação</h4>
                      <p className="text-2xl font-bold">
                        {settings?.gateway_fee_percentage ? `${settings.gateway_fee_percentage}%` : '3.5%'}
                      </p>
                      <p className="text-sm text-muted-foreground">Gateway de pagamento</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium">Taxa da Plataforma</h4>
                      <p className="text-2xl font-bold">
                        {settings ? formatFeeDisplay(settings.platform_fee_value, settings.platform_fee_type) : '5.0%'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {settings?.platform_fee_type === 'percentage' ? 'Percentual' : 'Valor fixo'}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium">Taxa de Saque</h4>
                      <p className="text-2xl font-bold">
                        {settings ? formatFeeDisplay(settings.reseller_withdrawal_fee_value, settings.reseller_withdrawal_fee_type) : 'R$ 5.00'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {settings?.reseller_withdrawal_fee_type === 'percentage' ? 'Percentual' : 'Valor fixo'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configurações de Segurança
              </CardTitle>
              <CardDescription>
                Gerencie políticas de segurança da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Autenticação 2FA</h4>
                    <p className="text-sm text-muted-foreground">Habilitado para admins</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Sessões Ativas</h4>
                    <p className="text-2xl font-bold">24h</p>
                    <p className="text-sm text-muted-foreground">Tempo limite</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analytics da Plataforma
              </CardTitle>
              <CardDescription>
                Métricas globais da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">Usuários Ativos</h4>
                  <p className="text-2xl font-bold">1,234</p>
                  <p className="text-sm text-green-600">+12% este mês</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">Transações</h4>
                  <p className="text-2xl font-bold">5,678</p>
                  <p className="text-sm text-green-600">+8% este mês</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">Receita Total</h4>
                  <p className="text-2xl font-bold">R$ 123,456</p>
                  <p className="text-sm text-green-600">+15% este mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Sistema de Usuários
              </CardTitle>
              <CardDescription>
                Configurações do sistema de usuários e roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Super Admins</h4>
                    <p className="text-2xl font-bold">1</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Admins</h4>
                    <p className="text-2xl font-bold">3</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Fornecedores</h4>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Revendedores</h4>
                    <p className="text-2xl font-bold">45</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Platform Settings Modal */}
      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configurações da Plataforma</DialogTitle>
          </DialogHeader>
          <PlatformSettingsForm onClose={() => setIsSettingsModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Plataforma;