import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Plus,
  GripVertical,
  Trash2,
  Package,
  ExternalLink,
  Sparkles,
  Calendar,
  Trophy,
} from 'lucide-react';
import { Feature } from '@/hooks/useFeatures';
import { useFeatureProducts, FeatureProduct } from '@/hooks/useFeatureProducts';
import { AddProductsToFeatureModal } from './AddProductsToFeatureModal';
import { GenerateTopProductsModal } from './GenerateTopProductsModal';
import { TopProductsWeeklySettingsModal } from './TopProductsWeeklySettingsModal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FeatureProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: Feature;
}

const SortableItem: React.FC<{
  item: FeatureProduct;
  index: number;
  onRemove: (id: string) => void;
  onUpdateReferenceLink: (id: string, link: string) => void;
}> = ({ item, index, onRemove, onUpdateReferenceLink }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background shadow-xs hover:border-border/80 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        title="Arraste para reordenar"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <Badge
        variant={index < 3 ? 'default' : 'outline'}
        className={`min-w-[28px] justify-center text-xs font-bold ${
          index === 0
            ? 'bg-amber-500 hover:bg-amber-600 text-white'
            : index === 1
            ? 'bg-slate-400 hover:bg-slate-500 text-white'
            : index === 2
            ? 'bg-amber-700 hover:bg-amber-800 text-white'
            : ''
        }`}
      >
        {index + 1}
      </Badge>

      {item.product_image ? (
        <img
          src={item.product_image}
          alt={item.product_name}
          className="w-10 h-10 rounded object-cover border"
        />
      ) : (
        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground border">
          Sem foto
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium truncate">{item.product_name}</p>
        <p className="text-xs text-muted-foreground">
          SKU: {item.product_sku || 'N/A'} | {formatPrice(item.product_price)}
        </p>
        <div className="flex items-center gap-1">
          <Input
            placeholder="Link de referência (ex: Mercado Livre)"
            defaultValue={item.reference_link || ''}
            onBlur={(e) => onUpdateReferenceLink(item.id, e.target.value)}
            className="h-7 text-xs"
          />
          {item.reference_link && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 flex-shrink-0"
              onClick={() => window.open(item.reference_link!, '_blank')}
            >
              <ExternalLink className="w-3 h-3 text-primary" />
            </Button>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => onRemove(item.id)}
        title="Remover produto"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

export const FeatureProductsModal: React.FC<FeatureProductsModalProps> = ({
  isOpen,
  onClose,
  feature,
}) => {
  const { products, isLoading, addProducts, removeProduct, reorderProducts, updateReferenceLink, refetch } =
    useFeatureProducts(feature?.id || null);
  const [localProducts, setLocalProducts] = useState<FeatureProduct[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [weeklySettingsModalOpen, setWeeklySettingsModalOpen] = useState(false);

  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localProducts.findIndex((p) => p.id === active.id);
    const newIndex = localProducts.findIndex((p) => p.id === over.id);
    const newItems = arrayMove(localProducts, oldIndex, newIndex);
    setLocalProducts(newItems);

    reorderProducts.mutate(
      newItems.map((item, i) => ({ id: item.id, ordem: i + 1 }))
    );
  };

  const handleRemove = (id: string) => {
    setLocalProducts((prev) => prev.filter((p) => p.id !== id));
    removeProduct.mutate(id);
  };

  const handleAddProducts = (productIds: string[]) => {
    addProducts.mutate({ featureId: feature.id, productIds });
  };

  const handleUpdateReferenceLink = (id: string, link: string) => {
    updateReferenceLink.mutate({ id, reference_link: link });
  };

  const autoUpdateConfig = feature?.metadata?.top_ranking_config;
  const isAutoUpdateEnabled = autoUpdateConfig?.auto_update_weekly;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-6">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Trophy className="w-5 h-5 text-amber-500" />
                Gerenciar Produtos - {feature?.nome}
              </DialogTitle>
              {isAutoUpdateEnabled && (
                <Badge variant="outline" className="text-[11px] gap-1 border-primary/40 text-primary">
                  <Calendar className="w-3 h-3" />
                  Auto Semanal Ativo
                </Badge>
              )}
            </div>
          </DialogHeader>

          {/* Barra de Ações Rápidas */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-2 pb-1 border-b">
            <span className="text-xs text-muted-foreground font-medium">
              {localProducts.length} produto(s) vinculado(s)
              {feature?.limite_produtos && ` • Limite: ${feature.limite_produtos}`}
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Botão para Gerar Top 3, 10, 20 */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 border-amber-500/30 hover:border-amber-500/60 text-amber-700 dark:text-amber-300"
                onClick={() => setGenerateModalOpen(true)}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Gerar Ranking por Vendas
              </Button>

              {/* Botão de Configuração de Atualização Semanal */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setWeeklySettingsModalOpen(true)}
              >
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Atualização Semanal
              </Button>

              {/* Botão Adicionar Produto (Manual ou Busca) */}
              <Button
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setAddModalOpen(true)}
                disabled={
                  !!feature?.limite_produtos &&
                  localProducts.length >= feature.limite_produtos
                }
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* Lista Ordenável de Produtos */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[140px] max-h-[480px] pr-1 py-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
              </div>
            ) : localProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Nenhum produto vinculado</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Clique em "Gerar Ranking por Vendas" para listar os mais vendidos automaticamente, ou "Adicionar" para vincular manualmente.
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => setGenerateModalOpen(true)}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Gerar Top 3, 10 ou 20
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => setAddModalOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Produto
                  </Button>
                </div>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={localProducts.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {localProducts.map((item, index) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      index={index}
                      onRemove={handleRemove}
                      onUpdateReferenceLink={handleUpdateReferenceLink}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>≡ Arraste para reordenar a posição dos produtos</span>
            {localProducts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => refetch()}
              >
                Recarregar lista
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para Buscar ou Cadastrar Manualmente */}
      <AddProductsToFeatureModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        featureId={feature?.id || ''}
        existingProductIds={localProducts.map((p) => p.produto_id)}
        onAdd={handleAddProducts}
        limite={feature?.limite_produtos}
        currentCount={localProducts.length}
      />

      {/* Modal para Gerar Top 3, Top 10, Top 20 baseado em processamento de pedidos */}
      <GenerateTopProductsModal
        isOpen={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        featureId={feature?.id || ''}
        featureName={feature?.nome}
        onSuccess={() => refetch()}
      />

      {/* Modal para Configuração de Atualização Semanal e Notificações */}
      {feature && (
        <TopProductsWeeklySettingsModal
          isOpen={weeklySettingsModalOpen}
          onClose={() => setWeeklySettingsModalOpen(false)}
          feature={feature}
        />
      )}
    </>
  );
};
