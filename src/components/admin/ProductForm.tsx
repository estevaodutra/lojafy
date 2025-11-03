import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, X, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { ImageUploadArea } from './ImageUploadArea';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { useEffect } from 'react';
import { VariantsManager, ProductVariant } from './VariantsManager';
import { DimensionsInput } from './DimensionsInput';
import { CategoryCreationModal } from './CategoryCreationModal';
import { SubcategoryCreationModal } from './SubcategoryCreationModal';

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  description: z.string().optional(),
  cost_price: z.coerce.number({ invalid_type_error: 'Preço de custo deve ser um número' }).positive('Preço de custo deve ser maior que zero').min(0.01, 'Preço de custo deve ser maior que zero'),
  price: z.coerce.number().min(0.01, 'Preço de venda deve ser maior que zero').optional(),
  original_price: z.coerce.number().min(0, 'Preço promocional não pode ser negativo').optional(),
  use_auto_pricing: z.boolean().default(false),
  category_id: z.string().uuid('Selecione uma categoria válida'),
  subcategory_id: z.string().optional(),
  brand: z.string().optional(),
  sku: z.string().optional(),
  gtin_ean13: z.string().regex(/^\d{13}$/, 'GTIN/EAN-13 deve ter 13 dígitos').optional().or(z.literal('')),
  stock_quantity: z.coerce.number().min(0, 'Estoque não pode ser negativo'),
  min_stock_level: z.coerce.number().min(1, 'Estoque mínimo deve ser pelo menos 1'),
  low_stock_alert: z.boolean().default(false),
  high_rotation: z.boolean().default(false),
  // Dimensions
  height: z.coerce.number().positive('Altura deve ser positiva').optional(),
  width: z.coerce.number().positive('Largura deve ser positiva').optional(),
  length: z.coerce.number().positive('Comprimento deve ser positivo').optional(),
  weight: z.coerce.number().positive('Peso deve ser positivo').optional(),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  badge: z.string().optional(),
  reference_ad_url: z.string().url('URL inválida').optional().or(z.literal('')),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onSuccess, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isSuperAdmin } = useUserRole();
  const { settings } = usePlatformSettings();
  const [specifications, setSpecifications] = useState<{ key: string; value: string }[]>(
    product?.specifications ? Object.entries(product.specifications).map(([key, value]) => ({ key, value: value as string })) : []
  );
  const [images, setImages] = useState<any[]>(() => {
    // Collect all image URLs from different sources
    const imageUrls: string[] = [];
    
    // Source 1: New format - images array
    if (product?.images && Array.isArray(product.images)) {
      imageUrls.push(...product.images.filter(Boolean));
    }
    
    // Source 2: Legacy format - single image_url
    if (product?.image_url && typeof product.image_url === 'string') {
      // Avoid duplicates
      if (!imageUrls.includes(product.image_url)) {
        imageUrls.unshift(product.image_url); // Add as first image
      }
    }
    
    // Source 3: Legacy format - main_image_url
    if (product?.main_image_url && typeof product.main_image_url === 'string') {
      if (!imageUrls.includes(product.main_image_url)) {
        imageUrls.unshift(product.main_image_url);
      }
    }
    
    // Map URLs to ImageFile format
    if (imageUrls.length > 0) {
      const initialImages = imageUrls.map((url: string, index: number) => ({
        id: `existing-${index}`,
        file: null,
        preview: url,
        url: url,
        isMain: product.main_image_url ? url === product.main_image_url : index === 0,
        isUploading: false
      }));
      
      // Ensure only one image is marked as main
      const mainCount = initialImages.filter(img => img.isMain).length;
      if (mainCount === 0 && initialImages.length > 0) {
        initialImages[0].isMain = true;
      } else if (mainCount > 1) {
        let foundMain = false;
        initialImages.forEach(img => {
          if (img.isMain && foundMain) {
            img.isMain = false;
          } else if (img.isMain) {
            foundMain = true;
          }
        });
      }
      
      return initialImages;
    }
    
    return [];
  });
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [dimensions, setDimensions] = useState({
    height: product?.height || undefined,
    width: product?.width || undefined,
    length: product?.length || undefined,
    weight: product?.weight || undefined,
  });

  const handleDimensionsChange = (newDimensions: any) => {
    setDimensions(newDimensions);
    // Update form values
    form.setValue('height', newDimensions.height);
    form.setValue('width', newDimensions.width);
    form.setValue('length', newDimensions.length);
    form.setValue('weight', newDimensions.weight);
  };
  const { toast } = useToast();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      cost_price: product?.cost_price && product.cost_price > 0 ? product.cost_price : undefined,
      price: product?.price && product.price > 0 ? product.price : 0,
      original_price: product?.original_price || undefined,
      use_auto_pricing: product?.use_auto_pricing ?? true,
      category_id: product?.category_id || '',
      subcategory_id: product?.subcategory_id || 'none',
      brand: product?.brand || '',
      sku: product?.sku || '',
      gtin_ean13: product?.gtin_ean13 || '',
      stock_quantity: product?.stock_quantity || 0,
      min_stock_level: product?.min_stock_level || 5,
      low_stock_alert: product?.low_stock_alert ?? false,
      high_rotation: product?.high_rotation ?? false,
      height: product?.height || undefined,
      width: product?.width || undefined,
      length: product?.length || undefined,
      weight: product?.weight || undefined,
      active: product?.active ?? true,
      featured: product?.featured ?? false,
      badge: product?.badge || '',
      reference_ad_url: product?.reference_ad_url || '',
    },
  });

  const selectedCategoryId = form.watch('category_id');
  const watchedCostPrice = form.watch('cost_price');
  const watchedUseAutoPricing = form.watch('use_auto_pricing');
  const watchedReferenceUrl = form.watch('reference_ad_url');

  // Auto-calculate price based on cost_price (only for super_admin with auto pricing enabled)
  useEffect(() => {
    if (isSuperAdmin() && settings && watchedUseAutoPricing) {
      const costPrice = Number(watchedCostPrice);
      // Só calcular se for número válido e maior que zero
      if (!isNaN(costPrice) && costPrice > 0) {
        const calculatedPrice = calculatePrice(
          costPrice,
          settings.platform_fee_value,
          settings.platform_fee_type,
          settings.gateway_fee_percentage
        );
        form.setValue('price', calculatedPrice);
      }
    }
  }, [watchedCostPrice, watchedUseAutoPricing, settings, isSuperAdmin, form]);

  // Auto-set featured when reference_ad_url is filled
  useEffect(() => {
    if (watchedReferenceUrl && watchedReferenceUrl.trim() !== '') {
      form.setValue('featured', true);
    }
  }, [watchedReferenceUrl, form]);

  // Calculate price based on cost and fees
  // Formula: (cost + profit_margin + additional_costs) / (1 - gateway_fee/100)
  // This ensures the gateway fee is calculated on the final price
  const calculatePrice = (
    costPrice: number,
    platformFee: number,
    platformFeeType: 'percentage' | 'fixed',
    gatewayFee: number
  ): number => {
    let priceBeforeFee = costPrice;
    
    // Apply platform fee (profit margin)
    if (platformFeeType === 'percentage') {
      priceBeforeFee += (costPrice * platformFee / 100);
    } else {
      priceBeforeFee += platformFee;
    }
    
    // Apply additional costs (if active)
    if (settings?.additional_costs && Array.isArray(settings.additional_costs)) {
      settings.additional_costs.forEach((cost: any) => {
        if (cost.active) {
          if (cost.type === 'percentage') {
            priceBeforeFee += (costPrice * cost.value / 100);
          } else {
            priceBeforeFee += cost.value;
          }
        }
      });
    }
    
    // Apply gateway fee on final price (correct formula)
    // Gateway fee should be calculated on the final amount, not the cost
    const finalPrice = priceBeforeFee / (1 - gatewayFee / 100);
    
    // Round to 2 decimal places
    return Math.round(finalPrice * 100) / 100;
  };

  // Get pricing breakdown for display
  const getPriceBreakdown = () => {
    // Validação robusta: deve ser número válido e maior que zero
    if (!settings || !watchedCostPrice || isNaN(Number(watchedCostPrice)) || Number(watchedCostPrice) <= 0) {
      return null;
    }

    const costPrice = Number(watchedCostPrice);
    const platformFeeAmount = settings.platform_fee_type === 'percentage'
      ? (costPrice * settings.platform_fee_value / 100)
      : settings.platform_fee_value;
    
    // Calculate additional costs total
    const additionalCosts: Array<{ name: string; amount: number }> = [];
    let additionalCostsTotal = 0;
    
    if (settings.additional_costs && Array.isArray(settings.additional_costs)) {
      settings.additional_costs.forEach((cost: any) => {
        if (cost.active) {
          const costAmount = cost.type === 'percentage'
            ? (costPrice * cost.value / 100)
            : cost.value;
          additionalCosts.push({ name: cost.name, amount: costAmount });
          additionalCostsTotal += costAmount;
        }
      });
    }
    
    // Calculate total price first
    const totalPrice = calculatePrice(
      costPrice,
      settings.platform_fee_value,
      settings.platform_fee_type,
      settings.gateway_fee_percentage
    );
    
    // Gateway fee is now calculated on the final price (correct method)
    const gatewayFeeAmount = totalPrice - (costPrice + platformFeeAmount + additionalCostsTotal);

    return {
      costPrice,
      platformFeeAmount,
      platformFeeLabel: settings.platform_fee_type === 'percentage' 
        ? `${settings.platform_fee_value}%` 
        : `R$ ${settings.platform_fee_value.toFixed(2)}`,
      additionalCosts,
      additionalCostsTotal,
      gatewayFeeAmount,
      gatewayFeeLabel: `${settings.gateway_fee_percentage}%`,
      totalPrice,
    };
  };

  const priceBreakdown = getPriceBreakdown();

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch subcategories based on selected category
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useQuery({
    queryKey: ['subcategories', selectedCategoryId],
    queryFn: async () => {
      if (!selectedCategoryId) return [];
      
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('category_id', selectedCategoryId)
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCategoryId,
  });

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    
    try {
      // Prepare specifications object
      const specificationsObj = specifications.reduce((acc, spec) => {
        if (spec.key && spec.value) {
          acc[spec.key] = spec.value;
        }
        return acc;
      }, {} as Record<string, string>);

      // Get main image URL from uploaded images
      const mainImage = images.find(img => img.isMain);
      const imageUrls = images.map(img => img.url || img.preview).filter(Boolean);

      // Prepare product data
      const productData: any = {
        name: data.name,
        description: data.description || null,
        cost_price: data.cost_price || null,
        price: data.price,
        original_price: data.original_price || null,
        use_auto_pricing: data.use_auto_pricing,
        category_id: data.category_id,
        subcategory_id: data.subcategory_id === 'none' ? null : data.subcategory_id,
        brand: data.brand || null,
        sku: data.sku || null, // Will be auto-generated if empty
        gtin_ean13: data.gtin_ean13 || null, // Will be auto-generated if empty
        stock_quantity: data.stock_quantity,
        min_stock_level: data.min_stock_level,
        low_stock_alert: data.low_stock_alert,
        high_rotation: data.high_rotation,
        height: dimensions.height || null,
        width: dimensions.width || null,
        length: dimensions.length || null,
        weight: dimensions.weight || null,
        main_image_url: mainImage?.url || mainImage?.preview || null,
        image_url: mainImage?.url || mainImage?.preview || null, // Backward compatibility
        active: data.active,
        featured: data.reference_ad_url && data.reference_ad_url.trim() !== '' ? true : data.featured,
        badge: data.badge || null,
        reference_ad_url: data.reference_ad_url || null,
        specifications: specificationsObj,
        images: imageUrls,
        updated_at: new Date().toISOString(),
      };

      let savedProduct;
      
      if (product?.id) {
        // VALIDATION: Prevent accidental image loss
        const hasOriginalImages = product.images && Array.isArray(product.images) && product.images.length > 0;
        const hasCurrentImages = imageUrls.length > 0;
        
        if (hasOriginalImages && !hasCurrentImages) {
          const confirmClear = window.confirm(
            '⚠️ ATENÇÃO: Este produto tinha imagens que não estão mais visíveis.\n\n' +
            'Salvar agora irá REMOVER todas as imagens do produto.\n\n' +
            'Deseja continuar?'
          );
          
          if (!confirmClear) {
            setIsSubmitting(false);
            toast({
              title: "Operação cancelada",
              description: "As alterações não foram salvas para proteger as imagens do produto.",
              variant: "default",
            });
            return;
          }
        }
        
        // Update existing product
        const { data: updated, error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id)
          .select()
          .single();

        if (error) throw error;
        savedProduct = updated;

        toast({
          title: "Produto atualizado",
          description: "As informações do produto foram atualizadas com sucesso.",
        });
      } else {
        // Create new product
        const { data: created, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (error) throw error;
        savedProduct = created;

        toast({
          title: "Produto criado",
          description: "O novo produto foi adicionado ao catálogo.",
        });
      }

      // Save variants if any
      if (variants.length > 0 && savedProduct?.id) {
        const variantData = variants.map(variant => ({
          product_id: savedProduct.id,
          type: variant.type,
          name: variant.name,
          value: variant.value,
          price_modifier: variant.priceModifier,
          stock_quantity: variant.stockQuantity,
          image_url: variant.imageUrl || null,
          active: variant.active
        }));

        // Delete existing variants for updates
        if (product?.id) {
          await supabase
            .from('product_variants')
            .delete()
            .eq('product_id', product.id);
        }

        const { error: variantError } = await supabase
          .from('product_variants')
          .insert(variantData);

        if (variantError) {
          console.error('Error saving variants:', variantError);
          toast({
            title: "Aviso",
            description: "Produto salvo, mas houve erro ao salvar as variações.",
            variant: "destructive",
          });
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: "Erro ao salvar produto",
        description: "Ocorreu um erro ao salvar as informações do produto.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-generate SKU
  const generateSku = useCallback(async () => {
    try {
      const categoryName = categories.find(cat => cat.id === form.getValues('category_id'))?.name;
      const brandName = form.getValues('brand');
      
      const { data, error } = await supabase.rpc('generate_sku', {
        category_name: categoryName,
        brand_name: brandName
      });
      
      if (error) throw error;
      
      form.setValue('sku', data);
      toast({
        title: "SKU gerado",
        description: `SKU gerado automaticamente: ${data}`,
      });
    } catch (error) {
      console.error('Error generating SKU:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o SKU automaticamente.",
        variant: "destructive",
      });
    }
  }, [categories, form, toast]);

  // Auto-generate GTIN/EAN-13
  const generateGtin = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('generate_gtin_ean13');
      
      if (error) throw error;
      
      form.setValue('gtin_ean13', data);
      toast({
        title: "GTIN/EAN-13 gerado",
        description: `Código gerado automaticamente: ${data}`,
      });
    } catch (error) {
      console.error('Error generating GTIN:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o GTIN/EAN-13 automaticamente.",
        variant: "destructive",
      });
    }
  }, [form, toast]);

  const addSpecification = () => {
    setSpecifications(prev => [...prev, { key: '', value: '' }]);
  };

  const removeSpecification = (index: number) => {
    setSpecifications(prev => prev.filter((_, i) => i !== index));
  };

  const updateSpecification = (index: number, field: 'key' | 'value', value: string) => {
    setSpecifications(prev => prev.map((spec, i) => 
      i === index ? { ...spec, [field]: value } : spec
    ));
  };

  // Reset subcategory when category changes
  const handleCategoryChange = (categoryId: string) => {
    form.setValue('category_id', categoryId);
    form.setValue('subcategory_id', 'none'); // Reset subcategory
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>
              Dados principais do produto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Produto *</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome do produto..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite a marca..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva as características do produto..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria *</FormLabel>
                      <div className="flex gap-2">
                        <Select 
                          onValueChange={handleCategoryChange} 
                          value={field.value} 
                          disabled={categoriesLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background border border-border shadow-lg">
                            {categories.map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <CategoryCreationModal
                          onCategoryCreated={(categoryId) => {
                            form.setValue('category_id', categoryId);
                          }}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedCategoryId && (
                  <FormField
                    control={form.control}
                    name="subcategory_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subcategoria</FormLabel>
                        <div className="flex gap-2">
                           <Select 
                            onValueChange={field.onChange} 
                            value={field.value || 'none'} 
                            disabled={subcategoriesLoading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma subcategoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background border border-border shadow-lg">
                              <SelectItem value="none">Nenhuma subcategoria</SelectItem>
                              {subcategories.map(subcategory => (
                                <SelectItem key={subcategory.id} value={subcategory.id}>
                                  {subcategory.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <SubcategoryCreationModal
                            categoryId={selectedCategoryId}
                            onSubcategoryCreated={(subcategoryId) => {
                              form.setValue('subcategory_id', subcategoryId);
                            }}
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="Será gerado automaticamente..." {...field} />
                        </FormControl>
                        <Button type="button" variant="outline" size="sm" onClick={generateSku}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormDescription>
                        Código único de identificação (gerado automaticamente se vazio)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gtin_ean13"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GTIN/EAN-13</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            placeholder="13 dígitos iniciados por 789..." 
                            maxLength={13}
                            {...field} 
                          />
                        </FormControl>
                        <Button type="button" variant="outline" size="sm" onClick={generateGtin}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormDescription>
                        Código de barras (gerado automaticamente se vazio)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="badge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Badge/Etiqueta</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Novo, Promoção, Bestseller..." {...field} />
                  </FormControl>
                  <FormDescription>
                    Etiqueta de destaque que aparecerá no produto (opcional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reference_ad_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Anúncio de Referência
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="url"
                      placeholder="https://exemplo.com/produto" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Link para anúncio externo onde o produto está mais barato. <strong>Quando preenchido, o produto será automaticamente marcado como destaque.</strong>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Preços */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preços</CardTitle>
                <CardDescription>
                  {isSuperAdmin() && watchedUseAutoPricing 
                    ? 'Precificação automática baseada no custo' 
                    : 'Configuração de valores e margem de lucro'}
                </CardDescription>
              </div>
              {isSuperAdmin() && watchedUseAutoPricing && (
                <Badge variant="secondary" className="gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Automático
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSuperAdmin() && (
              <FormField
                control={form.control}
                name="use_auto_pricing"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4 bg-muted/30">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Precificação Automática
                      </FormLabel>
                      <FormDescription>
                        Calcular preço automaticamente com base no custo, margem e taxas da plataforma
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="cost_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço de Custo *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Base para cálculo automático
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço de Venda *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                        readOnly={isSuperAdmin() && watchedUseAutoPricing}
                        className={isSuperAdmin() && watchedUseAutoPricing ? 'bg-muted cursor-not-allowed' : ''}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {isSuperAdmin() && watchedUseAutoPricing 
                        ? 'Calculado automaticamente' 
                        : 'Preço principal do produto'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="original_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço Promocional</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Para mostrar desconto (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Automatic Price Breakdown */}
            {isSuperAdmin() && watchedUseAutoPricing && priceBreakdown && (
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">Breakdown de Precificação</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Preço de Custo:</span>
                    <span className="font-medium">R$ {priceBreakdown.costPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-primary">
                    <span>+ Margem de Lucro ({priceBreakdown.platformFeeLabel}):</span>
                    <span className="font-medium">R$ {priceBreakdown.platformFeeAmount.toFixed(2)}</span>
                  </div>
                  {priceBreakdown.additionalCosts && priceBreakdown.additionalCosts.map((cost: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-blue-600">
                      <span>+ {cost.name}:</span>
                      <span className="font-medium">R$ {cost.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-primary">
                    <span>+ Taxa de Transação ({priceBreakdown.gatewayFeeLabel}):</span>
                    <span className="font-medium">R$ {priceBreakdown.gatewayFeeAmount.toFixed(2)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center text-base">
                    <span className="font-semibold">Preço de Venda Final:</span>
                    <span className="font-bold text-primary">R$ {priceBreakdown.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Profit Calculation (for non-super-admin or when auto pricing is disabled) */}
            {(!isSuperAdmin() || !watchedUseAutoPricing) && (() => {
              const costPrice = form.watch('cost_price');
              const salePrice = form.watch('price');
              
              if (costPrice && salePrice && costPrice > 0) {
                const profitAmount = salePrice - costPrice;
                const profitPercentage = (profitAmount / costPrice) * 100;
                
                return (
                  <div className="bg-muted/50 p-4 rounded-lg border">
                    <h4 className="text-sm font-medium mb-2">Cálculo de Lucro</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Margem:</span>
                        <div className="font-semibold text-primary">
                          {profitPercentage.toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Lucro:</span>
                        <div className="font-semibold text-primary">
                          R$ {profitAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </CardContent>
        </Card>

        {/* Estoque */}
        <Card>
          <CardHeader>
            <CardTitle>Estoque</CardTitle>
            <CardDescription>
              Controle de quantidade e alertas de estoque
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stock_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade em Estoque *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        placeholder="0" 
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Quantidade disponível para venda
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="min_stock_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque Mínimo *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        placeholder="5" 
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Quando alertar sobre estoque baixo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel>Alertar Quando Atingir Estoque Mínimo</FormLabel>
                <FormDescription>
                  Receber notificação quando estoque ficar baixo
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="low_stock_alert"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Imagens do Produto</CardTitle>
            <CardDescription>
              Faça upload de até 10 imagens do produto. A primeira imagem será definida como principal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploadArea
              images={images}
              onImagesChange={setImages}
              maxImages={10}
              productId={product?.id}
            />
          </CardContent>
        </Card>

        {/* Dimensões */}
        <Card>
          <CardHeader>
            <CardTitle>Dimensões e Peso</CardTitle>
            <CardDescription>
              Medidas físicas do produto para cálculo de frete
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DimensionsInput 
              dimensions={dimensions}
              onDimensionsChange={handleDimensionsChange}
            />
          </CardContent>
        </Card>

        {/* Specifications */}
        <Card>
          <CardHeader>
            <CardTitle>Especificações Técnicas</CardTitle>
            <CardDescription>
              Características e especificações customizadas do produto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Especificações Customizadas</h4>
              <Button type="button" variant="outline" size="sm" onClick={addSpecification}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Especificação
              </Button>
            </div>

            {specifications.map((spec, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div className="md:col-span-2">
                  <Input
                    placeholder="Nome da especificação"
                    value={spec.key}
                    onChange={(e) => updateSpecification(index, 'key', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    placeholder="Valor"
                    value={spec.value}
                    onChange={(e) => updateSpecification(index, 'value', e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeSpecification(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Product Variants */}
        <VariantsManager
          variants={variants}
          onVariantsChange={setVariants}
        />

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
            <CardDescription>
              Configurações de exibição e status do produto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel>Produto Ativo</FormLabel>
                <FormDescription>
                  Define se o produto está disponível para venda
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel>Produto em Destaque</FormLabel>
                <FormDescription>
                  {watchedReferenceUrl && watchedReferenceUrl.trim() !== '' 
                    ? '✓ Ativado automaticamente pelo Anúncio de Referência' 
                    : 'Produto será exibido em seções especiais'}
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="featured"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={watchedReferenceUrl && watchedReferenceUrl.trim() !== ''}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel>Produto de Alta Rotatividade</FormLabel>
                <FormDescription>
                  Produto com alta demanda que requer aviso especial no checkout
                </FormDescription>
              </div>
              <FormField
                control={form.control}
                name="high_rotation"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-border">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {product?.id ? 'Atualizar Produto' : 'Criar Produto'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProductForm;