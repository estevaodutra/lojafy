import React, { useState, useCallback, useRef } from 'react';
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
import { Loader2, Plus, X, RefreshCw, ExternalLink, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { ImageUploadArea } from './ImageUploadArea';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { DimensionsInput } from './DimensionsInput';
import { CategoryCreationModal } from './CategoryCreationModal';
import { SubcategoryCreationModal } from './SubcategoryCreationModal';
import { useQueryClient } from '@tanstack/react-query';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import { VariantsManager, ProductVariant } from './VariantsManager';

export const isUsableProductImage = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string' || url.trim() === '') return false;
  
  const lowerUrl = url.toLowerCase();
  const invalidKeywords = [
    'sem-imagem',
    'semimagem',
    'sem_imagem',
    'no-image',
    'no_image',
    'noimage',
    'placeholder',
    'indisponivel',
    'indisponível',
    'image-not-found',
    'notfound',
    'quebrada'
  ];
  
  if (invalidKeywords.some(kw => lowerUrl.includes(kw))) {
    return false;
  }
  
  try {
    new URL(url);
  } catch {
    return false;
  }
  
  return true;
};

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  description: z.string().optional(),
  cost_price: z.coerce.number({ invalid_type_error: 'Preço de custo deve ser um número' }).positive('Preço de custo deve ser maior que zero').min(0.01, 'Preço de custo deve ser maior que zero'),
  price: z.coerce.number().min(0.01, 'Preço de venda deve ser maior que zero').optional(),
  original_price: z.coerce.number().min(0, 'Preço promocional não pode ser negativo').optional(),
  use_auto_pricing: z.boolean().default(false),
  use_default_profit_margin: z.boolean().default(true),
  custom_profit_margin_percentage: z.coerce.number().min(0).max(100).optional(),
  category_id: z.string().optional().or(z.literal('')),
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
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isSuperAdmin, isSupplier } = useUserRole();
  const { user } = useAuth();
  const { settings } = usePlatformSettings();
  const { data: supplierOrgData } = useSupplierOrganization();
  const supplierSettings = supplierOrgData?.settings;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      cost_price: product?.cost_price && product.cost_price > 0 ? product.cost_price : undefined,
      price: product?.price && product.price > 0 ? product.price : 0,
      original_price: product?.original_price || undefined,
      use_auto_pricing: product?.use_auto_pricing ?? true,
      use_default_profit_margin: product?.use_default_profit_margin ?? true,
      custom_profit_margin_percentage: product?.custom_profit_margin_percentage ?? undefined,
      category_id: product?.category_id || '',
      subcategory_id: product?.subcategory_id || 'none',
      brand: product?.brand || '',
      sku: product?.sku || '',
      gtin_ean13: product?.gtin_ean13 || '',
      stock_quantity: product?.stock_quantity || 0,
      min_stock_level: product?.min_stock_level ?? supplierSettings?.default_min_stock_level ?? 100,
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

  // Fetch categories (moved to top of component to avoid initialization order ReferenceError)
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

  const ensureCategory = async (productName: string, domainId?: string): Promise<string> => {
    const lowerName = productName.toLowerCase();
    const keywordMap = [
      { keywords: ['bolo', 'doce', 'confeitaria', 'sobremesa', 'chocolate'], categoryName: 'Bolos e Confeitaria' },
      { keywords: ['ventilador', 'climatizador', 'ar condicionado', 'aquecedor'], categoryName: 'Eletrodomésticos' },
      { keywords: ['celular', 'smartphone', 'telefone', 'capinha', 'carregador'], categoryName: 'Celulares e Acessórios' },
      { keywords: ['fone', 'headphone', 'caixa de som', 'audio'], categoryName: 'Eletrônicos e Áudio' },
      { keywords: ['camiseta', 'calça', 'vestido', 'roupa', 'meia', 'casaco'], categoryName: 'Moda e Vestuário' },
      { keywords: ['copo', 'prato', 'panela', 'cozinha', 'talher'], categoryName: 'Cozinha e Casa' },
    ];

    let targetCategoryName: string | null = null;
    
    for (const mapping of keywordMap) {
      if (mapping.keywords.some(kw => lowerName.includes(kw))) {
        targetCategoryName = mapping.categoryName;
        break;
      }
    }

    if (domainId) {
      const mlDomainMap: Record<string, string> = {
        'MLB-FANS': 'Ventiladores e Climatização',
        'MLB-CELLPHONES': 'Celulares e Acessórios',
        'MLB-SMARTWATCHES': 'Relógios e Smartwatches',
        'MLB-HEADPHONES': 'Áudio e Fones',
        'MLB-CAKES': 'Bolos e Doces',
        'MLB-COFFEEMAKERS': 'Cafeteiras e Eletro',
        'MLB-AIR_CONDITIONERS': 'Ar Condicionado',
        'MLB-SHOES': 'Calçados',
        'MLB-T_SHIRTS': 'Camisetas e Moda',
        'MLB-PANTS': 'Calças e Moda',
      };
      const mapped = mlDomainMap[domainId.toUpperCase()];
      if (mapped) {
        targetCategoryName = mapped;
      }
    }

    if (!targetCategoryName) {
      throw new Error('Não foi possível identificar uma categoria correspondente.');
    }

    const existing = categories.find((cat: any) => cat.name.toLowerCase() === targetCategoryName!.toLowerCase());
    if (existing) {
      return existing.id;
    }

    const slug = targetCategoryName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    try {
      const { data: newCat, error } = await supabase
        .from('categories')
        .insert({
          name: targetCategoryName,
          slug: slug,
          active: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      
      return newCat.id;
    } catch (e) {
      console.error('Erro ao criar categoria automática:', e);
      throw new Error('Falha ao registrar nova categoria no banco.');
    }
  };

  const watchedName = form.watch('name');

  useEffect(() => {
    const initGtin = async () => {
      const currentGtin = form.getValues('gtin_ean13');
      if (!currentGtin || currentGtin.trim() === '') {
        try {
          const { data: remoteGtin } = await supabase.rpc('generate_gtin_ean13');
          if (remoteGtin) {
            form.setValue('gtin_ean13', remoteGtin);
          }
        } catch (err) {
          console.error('Erro ao obter GTIN inicial:', err);
        }
      }
    };

    initGtin();
  }, [product, form]);

  // Atualiza o estoque mínimo padrão a partir das configurações do fornecedor assim que carregar
  useEffect(() => {
    if (supplierSettings) {
      const currentMinStock = form.getValues('min_stock_level');
      if (product === undefined && (currentMinStock === undefined || currentMinStock === 100)) {
        form.setValue('min_stock_level', supplierSettings.default_min_stock_level ?? 100);
      }
    }
  }, [supplierSettings, product, form]);

  const [specifications, setSpecifications] = useState<{ key: string; value: string }[]>(() => {
    // First try to load from specifications (legacy format: {key: value})
    // Filter out null/empty values to avoid using empty legacy data over real attributes
    if (product?.specifications && typeof product.specifications === 'object') {
      const specEntries = Object.entries(product.specifications).filter(([_, v]) => v != null && v !== '');
      if (specEntries.length > 0) {
        return specEntries.map(([key, value]) => ({ key, value: value as string }));
      }
    }
    
    // Then try to load from attributes (new ML format: [{id, name, value_name, ...}] or backend object)
    let attrList: any[] = [];
    if (product?.attributes) {
      if (Array.isArray(product.attributes)) {
        attrList = product.attributes;
      } else if (typeof product.attributes === 'object') {
        const legacyList = (product.attributes as any).ml_reference_attributes;
        if (Array.isArray(legacyList)) {
          attrList = legacyList;
        }
      }
    }

    if (attrList.length > 0) {
      return attrList.map((attr: any) => ({
        key: attr.name || attr.id || '',
        value: attr.value_name || attr.value || '',
      }));
    }
    return [];
  });
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
    const filteredUrls = imageUrls.filter(url => isUsableProductImage(url));
    if (filteredUrls.length > 0) {
      const initialImages = filteredUrls.map((url: string, index: number) => ({
        id: `existing-${index}`,
        file: null,
        preview: url,
        url: url,
        isMain: index === 0,
        isUploading: false
      }));
      
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

  const selectedCategoryId = form.watch('category_id');
  const watchedCostPrice = form.watch('cost_price');
  const watchedUseAutoPricing = form.watch('use_auto_pricing');
  const watchedReferenceUrl = form.watch('reference_ad_url');

  const watchedUseDefaultMargin = form.watch('use_default_profit_margin');
  const watchedCustomMargin = form.watch('custom_profit_margin_percentage');

  // Auto-calculate price based on cost_price with auto pricing enabled
  useEffect(() => {
    if (watchedUseAutoPricing) {
      const costPrice = Number(watchedCostPrice);
      // Só calcular se for número válido e maior que zero
      if (!isNaN(costPrice) && costPrice > 0) {
        const margin = watchedUseDefaultMargin 
          ? (supplierSettings?.default_profit_margin_percentage ?? 20) 
          : (watchedCustomMargin ?? 20);
        const calculatedPrice = calculatePrice(costPrice, margin);
        form.setValue('price', calculatedPrice);
      }
    }
  }, [watchedCostPrice, watchedUseAutoPricing, watchedUseDefaultMargin, watchedCustomMargin, settings, supplierSettings, form]);

  // Auto-set featured when reference_ad_url is filled
  useEffect(() => {
    if (watchedReferenceUrl && watchedReferenceUrl.trim() !== '') {
      form.setValue('featured', true);
    }
  }, [watchedReferenceUrl, form]);

  // Calculate price based on cost, desired margin and fees
  // Formula: (cost + fixed_fees) / (1 - desired_margin/100 - percent_fees/100)
  const calculatePrice = (costPrice: number, marginPercentage: number): number => {
    let fixedFees = 0;
    let percentFees = 0;

    if (settings) {
      if (settings.platform_fee_type === 'fixed') {
        fixedFees += settings.platform_fee_value;
      } else {
        percentFees += settings.platform_fee_value / 100;
      }
      percentFees += (settings.gateway_fee_percentage || 0) / 100;

      if (settings.additional_costs && Array.isArray(settings.additional_costs)) {
        settings.additional_costs.forEach((c: any) => {
          if (c.active) {
            if (c.type === 'fixed') {
              fixedFees += c.value;
            } else {
              percentFees += c.value / 100;
            }
          }
        });
      }
    }

    const denominator = Math.max(0.05, 1 - (marginPercentage / 100) - percentFees);
    let calculated = (costPrice + fixedFees) / denominator;

    // Aplicar estratégia de arredondamento do fornecedor
    const rounding = supplierSettings?.price_rounding_strategy ?? '90';
    if (rounding === '90') {
      calculated = Math.ceil(calculated - 0.90) + 0.90;
    } else if (rounding === '99') {
      calculated = Math.ceil(calculated - 0.99) + 0.99;
    } else {
      calculated = Math.round(calculated * 100) / 100;
    }

    return calculated;
  };

  // Get pricing breakdown for display
  const getPriceBreakdown = () => {
    if (!settings || !watchedCostPrice || isNaN(Number(watchedCostPrice)) || Number(watchedCostPrice) <= 0) {
      return null;
    }

    const costPrice = Number(watchedCostPrice);
    const margin = watchedUseDefaultMargin 
      ? (supplierSettings?.default_profit_margin_percentage ?? 20) 
      : (watchedCustomMargin ?? 20);
      
    const totalPrice = calculatePrice(costPrice, margin);

    let fixedFees = 0;
    let percentFees = 0;

    if (settings) {
      if (settings.platform_fee_type === 'fixed') {
        fixedFees += settings.platform_fee_value;
      } else {
        percentFees += settings.platform_fee_value / 100;
      }
      percentFees += (settings.gateway_fee_percentage || 0) / 100;
    }

    const additionalCosts: Array<{ name: string; amount: number }> = [];
    let additionalCostsTotal = 0;
    
    if (settings.additional_costs && Array.isArray(settings.additional_costs)) {
      settings.additional_costs.forEach((cost: any) => {
        if (cost.active) {
          const costAmount = cost.type === 'percentage'
            ? (totalPrice * cost.value / 100)
            : cost.value;
          additionalCosts.push({ name: cost.name, amount: costAmount });
          additionalCostsTotal += costAmount;
        }
      });
    }

    const gatewayFeeAmount = totalPrice * (settings.gateway_fee_percentage || 0) / 100;
    const platformFeeAmount = settings.platform_fee_type === 'percentage'
      ? (totalPrice * settings.platform_fee_value / 100)
      : settings.platform_fee_value;

    const estimatedNetProfit = totalPrice * (1 - percentFees) - costPrice - fixedFees;

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
      estimatedNetProfit,
      margin
    };
  };

  const priceBreakdown = getPriceBreakdown();

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

  // Fetch existing variants when editing a product
  const { data: existingVariants = [] } = useQuery({
    queryKey: ['product-variants', product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', product.id)
        .order('price_modifier', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!product?.id,
  });

  // Populate variants state when existing variants are loaded
  const variantsInitialized = useRef(false);

  // Reset initialization when product changes
  useEffect(() => {
    variantsInitialized.current = false;
    setVariants([]);
  }, [product?.id]);

  useEffect(() => {
    if (existingVariants && existingVariants.length > 0 && !variantsInitialized.current) {
      variantsInitialized.current = true;
      const mappedVariants: ProductVariant[] = existingVariants.map(v => ({
        id: v.id,
        type: v.type as 'color' | 'size' | 'model',
        name: v.name,
        value: v.value,
        costPrice: (v as any).cost_price || v.price_modifier || 0,
        priceModifier: v.price_modifier || 0,
        stockQuantity: v.stock_quantity || 0,
        imageUrl: v.image_url || '',
        active: v.active ?? true,
        sku: (v as any).sku || '',
      }));
      setVariants(mappedVariants);
    }
  }, [existingVariants]);

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

      // First image is always the main image
      const imageUrls = images.map(img => img.url || img.preview).filter(url => isUsableProductImage(url));
      const mainImageUrl = imageUrls.length > 0 ? imageUrls[0] : null;

      // 1. Categorização Automática
      let finalCategoryId = data.category_id;
      if (!finalCategoryId || finalCategoryId === '') {
        try {
          const domainId = product?.domain_id || (product?.raw_data as any)?.domain_id;
          finalCategoryId = await ensureCategory(data.name, domainId);
        } catch (catErr) {
          console.error('Erro ao categorizar automaticamente:', catErr);
        }
      }

      // 2. Resolução do GTIN (se vazio, tenta obter da RPC oficial do banco, ou deixa vazio)
      let finalGtin = data.gtin_ean13 || null;
      if (!finalGtin) {
        try {
          const { data: remoteGtin } = await supabase.rpc('generate_gtin_ean13');
          if (remoteGtin) {
            finalGtin = remoteGtin;
          }
        } catch (gtinErr) {
          console.error('Erro ao chamar rpc de gtin:', gtinErr);
        }
      }

      // Sanitizar imagens externas (ex: mlstatic.com) para salvar no bucket product-images
      let sanitizedImageUrls = [...imageUrls];
      let sanitizedMainImageUrl = mainImageUrl;

      if (imageUrls.some(url => typeof url === 'string' && (url.includes('mlstatic.com') || (!url.includes('product-images') && url.startsWith('http'))))) {
        try {
          const { data: sanitizeRes } = await supabase.functions.invoke('ml-sanitize-image', {
            body: { urls: imageUrls }
          });
          if (sanitizeRes?.sanitizedUrls && Array.isArray(sanitizeRes.sanitizedUrls)) {
            sanitizedImageUrls = sanitizeRes.sanitizedUrls;
            if (mainImageUrl && sanitizeRes.mapping?.[mainImageUrl]) {
              sanitizedMainImageUrl = sanitizeRes.mapping[mainImageUrl];
            } else {
              sanitizedMainImageUrl = sanitizedImageUrls[0] || '';
            }
          }
        } catch (sanitizeErr) {
          console.warn('Erro ao sanitizar mídias no formulário:', sanitizeErr);
        }
      }

      // Prepare product data
      const productData: any = {
        name: data.name,
        description: data.description || null,
        cost_price: data.cost_price || null,
        price: data.price,
        original_price: data.original_price || null,
        use_auto_pricing: data.use_auto_pricing,
        use_default_profit_margin: data.use_default_profit_margin,
        custom_profit_margin_percentage: data.custom_profit_margin_percentage || null,
        calculated_price: data.use_auto_pricing ? data.price : null,
        estimated_net_profit: priceBreakdown ? priceBreakdown.estimatedNetProfit : null,
        pricing_calculation_snapshot: priceBreakdown ? {
          cost_price: priceBreakdown.costPrice,
          margin: priceBreakdown.margin,
          gateway_fee: priceBreakdown.gatewayFeeAmount,
          platform_fee: priceBreakdown.platformFeeAmount,
          additional_costs: priceBreakdown.additionalCosts,
          calculated_price: priceBreakdown.totalPrice,
          rounding_strategy: supplierSettings?.price_rounding_strategy ?? '90'
        } : null,
        category_id: finalCategoryId || null,
        subcategory_id: data.subcategory_id === 'none' ? null : data.subcategory_id,
        brand: data.brand || null,
        sku: data.sku ? data.sku.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : null,
        gtin_ean13: finalGtin,
        stock_quantity: data.stock_quantity,
        min_stock_level: data.min_stock_level,
        low_stock_alert: data.low_stock_alert,
        high_rotation: data.high_rotation,
        height: dimensions.height || null,
        width: dimensions.width || null,
        length: dimensions.length || null,
        weight: dimensions.weight || null,
        main_image_url: sanitizedMainImageUrl,
        image_url: sanitizedMainImageUrl, // Backward compatibility
        active: data.active,
        featured: data.reference_ad_url && data.reference_ad_url.trim() !== '' ? true : data.featured,
        badge: data.badge || null,
        reference_ad_url: data.reference_ad_url || null,
        specifications: specificationsObj,
        images: sanitizedImageUrls,
        updated_at: new Date().toISOString(),
      };

      if (isSupplier()) {
        productData.supplier_id = user?.id;
        if (!product?.id) {
          productData.approval_status = 'pending_approval';
        }
      }

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
        // Create new product - save original_* fields once
        const { data: created, error } = await supabase
          .from('products')
          .insert({
            ...productData,
            original_name: data.name,
            original_description: data.description || null,
            original_images: imageUrls,
            original_saved_at: new Date().toISOString(),
          })
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
          cost_price: variant.costPrice,
          price_modifier: variant.priceModifier,
          stock_quantity: variant.stockQuantity,
          image_url: variant.imageUrl || null,
          active: variant.active,
          sku: variant.sku ? variant.sku.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : null
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
      
      const cleanSku = data ? data.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
      form.setValue('sku', cleanSku);
      toast({
        title: "SKU gerado",
        description: `SKU gerado automaticamente: ${cleanSku}`,
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
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon" 
                          title="Categorizar automaticamente"
                          className="px-3"
                          onClick={async () => {
                            const name = form.getValues('name');
                            if (!name) {
                              toast({ title: 'Digite o nome do produto primeiro', variant: 'destructive' });
                              return;
                            }
                            try {
                              const domainId = product?.domain_id || (product?.raw_data as any)?.domain_id;
                              const catId = await ensureCategory(name, domainId);
                              form.setValue('category_id', catId);
                              toast({ title: 'Categoria identificada com sucesso!' });
                            } catch (err: any) {
                              toast({ title: 'Erro ao categorizar', description: err.message, variant: 'destructive' });
                            }
                          }}
                        >
                          <Sparkles className="h-4 w-4 text-primary" />
                        </Button>
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
                  {watchedUseAutoPricing 
                    ? 'Precificação automática baseada no custo' 
                    : 'Configuração de valores e margem de lucro'}
                </CardDescription>
              </div>
              {watchedUseAutoPricing && (
                <Badge variant="secondary" className="gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Automático
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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

            {watchedUseAutoPricing && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border border-border bg-muted/10 my-2">
                <FormField
                  control={form.control}
                  name="use_default_profit_margin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg p-2 gap-4">
                      <div className="space-y-0.5">
                        <FormLabel>Usar Margem Padrão da Empresa</FormLabel>
                        <FormDescription>
                          Aplica a margem global ({supplierSettings?.default_profit_margin_percentage ?? 20}%) configurada nas configurações da empresa.
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

                {!form.watch('use_default_profit_margin') && (
                  <FormField
                    control={form.control}
                    name="custom_profit_margin_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Margem Personalizada (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="Ex: 25.0"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Insira a margem de lucro líquido desejada para este produto.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
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
                        readOnly={watchedUseAutoPricing}
                        className={watchedUseAutoPricing ? 'bg-muted cursor-not-allowed' : ''}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {watchedUseAutoPricing 
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
            {watchedUseAutoPricing && priceBreakdown && (
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
                  <div className="flex justify-between items-center text-green-600 font-semibold pt-1 border-t border-dashed">
                    <span>Lucro Líquido Projetado:</span>
                    <span>R$ {priceBreakdown.estimatedNetProfit.toFixed(2)} ({priceBreakdown.margin}%)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Profit Calculation (for non-super-admin or when auto pricing is disabled) */}
            {!watchedUseAutoPricing && (() => {
              const costPrice = form.watch('cost_price');
              const salePrice = form.watch('price');
              
              if (costPrice && salePrice && costPrice > 0) {
                let fixedFees = 0;
                let percentFees = 0;

                if (settings) {
                  if (settings.platform_fee_type === 'fixed') {
                    fixedFees += settings.platform_fee_value;
                  } else {
                    percentFees += settings.platform_fee_value / 100;
                  }
                  percentFees += (settings.gateway_fee_percentage || 0) / 100;

                  if (settings.additional_costs && Array.isArray(settings.additional_costs)) {
                    settings.additional_costs.forEach((c: any) => {
                      if (c.active) {
                        if (c.type === 'fixed') {
                          fixedFees += c.value;
                        } else {
                          percentFees += c.value / 100;
                        }
                      }
                    });
                  }
                }

                const feesAmount = fixedFees + (salePrice * percentFees);
                const netProfit = salePrice - costPrice - feesAmount;
                const netMargin = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;
                
                return (
                  <div className="bg-muted/50 p-4 rounded-lg border">
                    <h4 className="text-sm font-medium mb-2">Cálculo de Lucro Líquido Real (Projeção)</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Margem Líquida:</span>
                        <div className="font-semibold text-primary">
                          {netMargin.toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Lucro Líquido:</span>
                        <div className={`font-semibold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          R$ {netProfit.toFixed(2)}
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
          platformSettings={settings}
          productCostPrice={Number(watchedCostPrice) || 0}
          useAutoPricing={!!watchedUseAutoPricing}
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