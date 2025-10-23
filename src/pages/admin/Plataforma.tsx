import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Settings, BarChart3, Users, Loader2, DollarSign, CreditCard, Wallet } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { EditableFeeCard } from '@/components/admin/EditableFeeCard';
import { AdditionalCostsManager } from '@/components/admin/AdditionalCostsManager';

const Plataforma = () => {
  const { 
    settings, 
    isLoading, 
    updateSettings,
    addAdditionalCost,
    updateAdditionalCost,
    deleteAdditionalCost,
  } = usePlatformSettings();

  const handleUpdateFee = async (
    field: 'platform_fee' | 'gateway_fee' | 'reseller_withdrawal_fee',
    value: number,
    type: 'percentage' | 'fixed'
  ) => {
    const updateData: any = {};
    
    if (field === 'platform_fee') {
      updateData.platform_fee_value = value;
      updateData.platform_fee_type = type;
    } else if (field === 'gateway_fee') {
      updateData.gateway_fee_percentage = value;
    } else if (field === 'reseller_withdrawal_fee') {
      updateData.reseller_withdrawal_fee_value = value;
      updateData.reseller_withdrawal_fee_type = type;
    }
    
    updateSettings(updateData);
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
          <div>
            <h2 className="text-xl font-semibold mb-4">Taxas da Plataforma</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Configure as taxas individuais que serão aplicadas no cálculo de preços dos produtos
            </p>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Carregando configurações...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <EditableFeeCard
                  title="Margem de Lucro"
                  description="Margem padrão aplicada sobre o custo"
                  value={settings?.platform_fee_value || 5}
                  type={settings?.platform_fee_type || 'percentage'}
                  icon={DollarSign}
                  onUpdate={async (value, type) => {
                    await handleUpdateFee('platform_fee', value, type);
                  }}
                />
                
                <EditableFeeCard
                  title="Taxa de Gateway"
                  description="Taxa do gateway de pagamento"
                  value={settings?.gateway_fee_percentage || 3.5}
                  type="percentage"
                  icon={CreditCard}
                  onUpdate={async (value) => {
                    await handleUpdateFee('gateway_fee', value, 'percentage');
                  }}
                />
                
                <EditableFeeCard
                  title="Taxa de Saque"
                  description="Taxa cobrada no saque do revendedor"
                  value={settings?.reseller_withdrawal_fee_value || 5}
                  type={settings?.reseller_withdrawal_fee_type || 'fixed'}
                  icon={Wallet}
                  onUpdate={async (value, type) => {
                    await handleUpdateFee('reseller_withdrawal_fee', value, type);
                  }}
                />
              </div>
            )}
          </div>

          {!isLoading && settings && (
            <AdditionalCostsManager
              costs={settings.additional_costs || []}
              onAdd={(cost) => addAdditionalCost(cost)}
              onUpdate={(costId, updates) => updateAdditionalCost({ costId, updates })}
              onDelete={(costId) => deleteAdditionalCost(costId)}
            />
          )}
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
    </div>
  );
};

export default Plataforma;