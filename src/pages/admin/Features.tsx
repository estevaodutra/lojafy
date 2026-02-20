import React, { useState } from 'react';
import { Plus, Sparkles, Users, AlertCircle, Power } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFeatures, Feature } from '@/hooks/useFeatures';
import { FeatureCard } from '@/components/admin/FeatureCard';
import { FeatureFormModal } from '@/components/admin/FeatureFormModal';
import { FeatureProductsModal } from '@/components/admin/FeatureProductsModal';

const categoryLabels: Record<string, string> = {
  loja: '🏪 Loja',
  recursos: '🏆 Recursos',
  acessos: '🎯 Acessos',
  geral: '⚙️ Geral',
};

const Features: React.FC = () => {
  const {
    features,
    featuresByCategory,
    metrics,
    isLoading,
    upsertFeature,
    toggleFeatureActive,
  } = useFeatures();
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [productsModalFeature, setProductsModalFeature] = useState<Feature | null>(null);

  const handleEdit = (feature: Feature) => {
    setEditingFeature(feature);
    setFormModalOpen(true);
  };

  const handleCreate = () => {
    setEditingFeature(null);
    setFormModalOpen(true);
  };

  const handleSave = (data: Partial<Feature>) => {
    upsertFeature.mutate(data);
  };

  const handleToggleActive = (id: string, ativo: boolean) => {
    toggleFeatureActive.mutate({ id, ativo });
  };

  const handleManageProducts = (feature: Feature) => {
    setProductsModalFeature(feature);
  };

  // Filter features
  const filteredFeatures = features.filter((f) => {
    const matchesSearch =
      searchTerm === '' ||
      f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === 'all' || f.categoria === categoryFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'ativo' && f.ativo) ||
      (statusFilter === 'inativo' && !f.ativo);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Group filtered features by category
  const filteredByCategory = filteredFeatures.reduce((acc, feature) => {
    if (!acc[feature.categoria]) {
      acc[feature.categoria] = [];
    }
    acc[feature.categoria].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            Features da Plataforma
          </h1>
          <p className="text-muted-foreground">
            Gerencie as features disponíveis para os usuários
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Feature
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.totalAtivas}</p>
                <p className="text-xs text-muted-foreground">Features Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <Users className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.totalUsuarios}</p>
                <p className="text-xs text-muted-foreground">
                  Usuários com Features
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <AlertCircle className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">-</p>
                <p className="text-xs text-muted-foreground">Expirando em 7d</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Power className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.totalInativas}</p>
                <p className="text-xs text-muted-foreground">Inativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome ou slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {Object.keys(categoryLabels).map((cat) => (
              <SelectItem key={cat} value={cat}>
                {categoryLabels[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativas</SelectItem>
            <SelectItem value="inativo">Inativas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Features by Category */}
      <div className="space-y-6">
        {Object.entries(filteredByCategory).map(([categoria, categoryFeatures]) => (
          <div key={categoria}>
            <h2 className="text-lg font-semibold mb-3">
              {categoryLabels[categoria] || categoria}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryFeatures.map((feature) => (
                <FeatureCard
                  key={feature.id}
                  feature={feature}
                  onEdit={handleEdit}
                  onToggleActive={handleToggleActive}
                  onManageProducts={handleManageProducts}
                />
              ))}
            </div>
          </div>
        ))}

        {Object.keys(filteredByCategory).length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma feature encontrada
          </div>
        )}
      </div>

      {/* Form Modal */}
      <FeatureFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingFeature(null);
        }}
        feature={editingFeature}
        onSave={handleSave}
      />

      {productsModalFeature && (
        <FeatureProductsModal
          isOpen={!!productsModalFeature}
          onClose={() => setProductsModalFeature(null)}
          feature={productsModalFeature}
        />
      )}
    </div>
  );
};

export default Features;
