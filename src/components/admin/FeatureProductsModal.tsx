import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, GripVertical, Trash2, Package } from 'lucide-react';
import { Feature } from '@/hooks/useFeatures';
import { useFeatureProducts, FeatureProduct } from '@/hooks/useFeatureProducts';
import { AddProductsToFeatureModal } from './AddProductsToFeatureModal';
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
}> = ({ item, index, onRemove }) => {
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
      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <Badge variant="outline" className="min-w-[28px] justify-center text-xs">
        {index + 1}
      </Badge>

      {item.product_image && (
        <img
          src={item.product_image}
          alt={item.product_name}
          className="w-10 h-10 rounded object-cover"
        />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.product_name}</p>
        <p className="text-xs text-muted-foreground">
          SKU: {item.product_sku} | {formatPrice(item.product_price)}
        </p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        onClick={() => onRemove(item.id)}
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
  const { products, isLoading, addProducts, removeProduct, reorderProducts } =
    useFeatureProducts(feature?.id || null);
  const [localProducts, setLocalProducts] = useState<FeatureProduct[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);

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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Gerenciar Produtos - {feature?.nome}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {localProducts.length} produto(s) vinculado(s)
              {feature?.limite_produtos && ` • Limite: ${feature.limite_produtos}`}
            </span>
            <Button
              size="sm"
              onClick={() => setAddModalOpen(true)}
              disabled={
                !!feature?.limite_produtos &&
                localProducts.length >= feature.limite_produtos
              }
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 min-h-[100px] max-h-[500px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : localProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum produto vinculado</p>
                <p className="text-xs">Clique em "Adicionar" para vincular produtos</p>
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
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            ≡ Arraste para reordenar os produtos
          </p>
        </DialogContent>
      </Dialog>

      <AddProductsToFeatureModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        featureId={feature?.id || ''}
        existingProductIds={localProducts.map((p) => p.produto_id)}
        onAdd={handleAddProducts}
        limite={feature?.limite_produtos}
        currentCount={localProducts.length}
      />
    </>
  );
};
