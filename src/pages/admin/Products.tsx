import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, AlertTriangle, TrendingUp, Download, Upload, ArrowUp, ArrowDown, Edit, Trash2, Loader2, Star, Link2 } from 'lucide-react';
import ProductTable from '@/components/admin/ProductTable';
import ProductForm from '@/components/admin/ProductForm';
import { ProductAdsView } from '@/components/admin/ProductAdsView';
import { MetaAdsManagerView } from '@/components/admin/MetaAdsManagerView';
import { ProductComparisonView } from '@/components/admin/ProductComparisonView';
import { RestoreOriginalButton } from '@/components/admin/RestoreOriginalButton';
import { CloneFromMarketplace } from '@/components/admin/CloneFromMarketplace';
import { ProductMlConfig } from '@/components/admin/ProductMlConfig';
import { AdminProductImport } from '@/components/admin/AdminProductImport';
import { Separator } from '@/components/ui/separator';
import StockAlert from '@/components/admin/StockAlert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { AutoCategorizeButton } from '@/components/admin/AutoCategorizeButton';

const Products = () => {
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Fetch products data
  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories!category_id(name),
          product_marketplace_data(id, marketplace, listing_status)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch categories for metrics
  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true);
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.active).length;
  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock_level);
  const outOfStockProducts = products.filter(p => p.stock_quantity === 0);

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleDuplicateProduct = (product) => {
    const duplicatedProduct = {
      ...product,
      id: undefined,
      name: `${product.name} (Cópia)`,
      sku: `${product.sku}-COPY-${Date.now()}`,
      stock_quantity: 0,
    };
    setEditingProduct(duplicatedProduct);
    setShowProductForm(true);
  };

  const handleFormSuccess = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    refetchProducts();
  };

  const handleExportProducts = () => {
    const csvContent = [
      ['ID', 'Nome', 'SKU', 'Preço', 'Categoria', 'Estoque', 'Status'].join(','),
      ...products.map(p => [
        p.id,
        `"${p.name}"`,
        p.sku || '',
        p.price,
        p.categories?.name || '',
        p.stock_quantity,
        p.active ? 'Ativo' : 'Inativo'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `produtos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (showProductForm) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setShowProductForm(false)} className="mb-4">
          ← Voltar para o Gerenciador Meta Ads
        </Button>
        <ProductForm
          initialData={editingProduct}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowProductForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AutoCategorizeButton />
      </div>
      <MetaAdsManagerView
        roleMode="admin"
        onNavigateToCreateProduct={handleCreateProduct}
        onEditProduct={handleEditProduct}
      />
    </div>
  );
};

export default Products;