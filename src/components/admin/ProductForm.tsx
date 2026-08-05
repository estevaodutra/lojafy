import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form } from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Info, 
  DollarSign, 
  Package, 
  Image as ImageIcon, 
  Ruler, 
  ListChecks, 
  Layers, 
  Settings, 
  Link2, 
  History,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';

// Subcomponentes Redesenhados
import { ProductEditHeader } from './product-form/ProductEditHeader';
import { ProductSectionNavigation, SectionStatus } from './product-form/ProductSectionNavigation';
import { StickySaveBar } from './product-form/StickySaveBar';
import { BasicInfoSection } from './product-form/BasicInfoSection';
import { PricingSection } from './product-form/PricingSection';
import { StockSection } from './product-form/StockSection';
import { ImagesSection } from './product-form/ImagesSection';
import { DimensionsSection } from './product-form/DimensionsSection';
import { SpecificationsSection } from './product-form/SpecificationsSection';
import { SettingsSection } from './product-form/SettingsSection';
import { LinkedReferenceSection } from './product-form/LinkedReferenceSection';
import { HistorySection } from './product-form/HistorySection';
import { CategoryCreationModal } from './CategoryCreationModal';
import { SubcategoryCreationModal } from './SubcategoryCreationModal';
import { VariantsManager, ProductVariant } from './VariantsManager';
import { ImageFile } from './ImageUploadArea';

export const isUsableProductImage = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string' || url.trim() === '') return false;
  
  const lowerUrl = url.toLowerCase();
  const invalidKeywords = [
    'sem-imagem', 'semimagem', 'sem_imagem', 'no-image', 'no_image', 'noimage', 
    'placeholder', 'indisponivel', 'indisponível', 'image-not-found', 'notfound', 'quebrada'
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

export const ProductForm: React.FC<ProductFormProps> = ({ product, onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingGtin, setIsGeneratingGtin] = useState(false);
  const { isSuperAdmin, isSupplier } = useUserRole();
  const { user } = useAuth();
  const { settings } = usePlatformSettings();
  const { data: supplierOrgData } = useSupplierOrganization();
  const supplierSettings = supplierOrgData?.settings;

  // Modais de Categoria
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);

  // Busca interna e Navegação
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('basic');

  // Controle de Accordions Abertos (Padronizado: Informações Básicas abertas por padrão, o resto recolhido)
  const [openAccordions, setOpenAccordions] = useState<string[]>(['basic']);

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

  // Categorias
  const { data: categories = [] } = useQuery({
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

  const selectedCategoryId = form.watch('category_id');

  // Subcategorias
  const { data: subcategories = [] } = useQuery({
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

  // Especificações técnicas
  const [specifications, setSpecifications] = useState<{ key: string; value: string }[]>(() => {
    if (product?.specifications && typeof product.specifications === 'object') {
      const specEntries = Object.entries(product.specifications).filter(([_, v]) => v != null && v !== '');
      if (specEntries.length > 0) {
        return specEntries.map(([key, value]) => ({ key, value: value as string }));
      }
    }
    let attrList: any[] = [];
    if (product?.attributes) {
      if (Array.isArray(product.attributes)) attrList = product.attributes;
      else if (typeof product.attributes === 'object') {
        const legacyList = (product.attributes as any).ml_reference_attributes;
        if (Array.isArray(legacyList)) attrList = legacyList;
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

  // Imagens
  const [images, setImages] = useState<ImageFile[]>(() => {
    const imageUrls: string[] = [];
    if (product?.images && Array.isArray(product.images)) imageUrls.push(...product.images.filter(Boolean));
    if (product?.image_url && typeof product.image_url === 'string' && !imageUrls.includes(product.image_url)) {
      imageUrls.unshift(product.image_url);
    }
    if (product?.main_image_url && typeof product.main_image_url === 'string' && !imageUrls.includes(product.main_image_url)) {
      imageUrls.unshift(product.main_image_url);
    }
    const filteredUrls = imageUrls.filter(url => isUsableProductImage(url));
    if (filteredUrls.length > 0) {
      return filteredUrls.map((url: string, index: number) => ({
        id: `existing-${index}`,
        preview: url,
        url: url,
        isMain: index === 0,
        isUploading: false
      }));
    }
    return [];
  });

  // Variações e Dimensões
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [dimensions, setDimensions] = useState({
    height: product?.height || undefined,
    width: product?.width || undefined,
    length: product?.length || undefined,
    weight: product?.weight || undefined,
  });

  const handleDimensionsChange = (newDimensions: any) => {
    setDimensions(newDimensions);
    form.setValue('height', newDimensions.height);
    form.setValue('width', newDimensions.width);
    form.setValue('length', newDimensions.length);
    form.setValue('weight', newDimensions.weight);
  };

  // Carregar Variações existentes
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

  const variantsInitialized = useRef(false);
  useEffect(() => {
    variantsInitialized.current = false;
    setVariants([]);
  }, [product?.id]);

  useEffect(() => {
    if (existingVariants && existingVariants.length > 0 && !variantsInitialized.current) {
      variantsInitialized.current = true;
      setVariants(existingVariants.map(v => ({
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
      })));
    }
  }, [existingVariants]);

  // Cálculos Automáticos de Preço
  const watchedCostPrice = form.watch('cost_price');
  const watchedUseAutoPricing = form.watch('use_auto_pricing');
  const watchedUseDefaultMargin = form.watch('use_default_profit_margin');
  const watchedCustomMargin = form.watch('custom_profit_margin_percentage');
  const watchedReferenceUrl = form.watch('reference_ad_url');

  const calculatePrice = (costPrice: number, marginPercentage: number): number => {
    let fixedFees = 0;
    let percentFees = 0;
    if (settings) {
      if (settings.platform_fee_type === 'fixed') fixedFees += settings.platform_fee_value;
      else percentFees += settings.platform_fee_value / 100;
      percentFees += (settings.gateway_fee_percentage || 0) / 100;

      if (settings.additional_costs && Array.isArray(settings.additional_costs)) {
        settings.additional_costs.forEach((c: any) => {
          if (c.active) {
            if (c.type === 'fixed') fixedFees += c.value;
            else percentFees += c.value / 100;
          }
        });
      }
    }

    const denominator = Math.max(0.05, 1 - (marginPercentage / 100) - percentFees);
    let calculated = (costPrice + fixedFees) / denominator;

    const rounding = supplierSettings?.price_rounding_strategy ?? '90';
    if (rounding === '90') calculated = Math.ceil(calculated - 0.90) + 0.90;
    else if (rounding === '99') calculated = Math.ceil(calculated - 0.99) + 0.99;
    else calculated = Math.round(calculated * 100) / 100;

    return calculated;
  };

  useEffect(() => {
    if (watchedUseAutoPricing) {
      const costPrice = Number(watchedCostPrice);
      if (!isNaN(costPrice) && costPrice > 0) {
        const margin = watchedUseDefaultMargin 
          ? (supplierSettings?.default_profit_margin_percentage ?? 20) 
          : (watchedCustomMargin ?? 20);
        form.setValue('price', calculatePrice(costPrice, margin));
      }
    }
  }, [watchedCostPrice, watchedUseAutoPricing, watchedUseDefaultMargin, watchedCustomMargin, settings, supplierSettings, form]);

  useEffect(() => {
    if (watchedReferenceUrl && watchedReferenceUrl.trim() !== '') {
      form.setValue('featured', true);
    }
  }, [watchedReferenceUrl, form]);

  const getPriceBreakdown = () => {
    if (!settings || !watchedCostPrice || isNaN(Number(watchedCostPrice)) || Number(watchedCostPrice) <= 0) return null;
    const costPrice = Number(watchedCostPrice);
    const margin = watchedUseDefaultMargin 
      ? (supplierSettings?.default_profit_margin_percentage ?? 20) 
      : (watchedCustomMargin ?? 20);
    const totalPrice = calculatePrice(costPrice, margin);

    let fixedFees = 0;
    let percentFees = 0;
    if (settings) {
      if (settings.platform_fee_type === 'fixed') fixedFees += settings.platform_fee_value;
      else percentFees += settings.platform_fee_value / 100;
      percentFees += (settings.gateway_fee_percentage || 0) / 100;
    }

    const gatewayFeeAmount = totalPrice * (settings.gateway_fee_percentage || 0) / 100;
    const platformFeeAmount = settings.platform_fee_type === 'percentage'
      ? (totalPrice * settings.platform_fee_value / 100)
      : settings.platform_fee_value;

    const estimatedNetProfit = totalPrice * (1 - percentFees) - costPrice - fixedFees;

    return {
      costPrice,
      platformFeeAmount,
      gatewayFeeAmount,
      totalPrice,
      estimatedNetProfit,
      margin,
      additionalCosts: 0
    };
  };

  const priceBreakdown = getPriceBreakdown();

  // Categorização Automática
  const ensureCategory = async (productName: string): Promise<string> => {
    const lowerName = productName.toLowerCase();
    const existing = categories.find((cat: any) => lowerName.includes(cat.name.toLowerCase()));
    if (existing) return existing.id;
    throw new Error('Não foi possível determinar a categoria.');
  };

  const handleAutoCategorize = async () => {
    const name = form.getValues('name');
    if (!name || name.trim() === '') {
      toast({ title: "Informe o nome do produto primeiro", variant: "destructive" });
      return;
    }
    try {
      const catId = await ensureCategory(name);
      form.setValue('category_id', catId);
      toast({ title: "Categoria sugerida com sucesso!" });
    } catch (e) {
      toast({ title: "Não foi possível determinar a categoria", description: "Selecione manualmente na lista.", variant: "destructive" });
    }
  };

  // Gerar GTIN via RPC
  const handleGenerateGtin = async () => {
    setIsGeneratingGtin(true);
    try {
      const { data: remoteGtin } = await supabase.rpc('generate_gtin_ean13');
      if (remoteGtin) {
        form.setValue('gtin_ean13', remoteGtin);
        toast({ title: "Código EAN-13 gerado com sucesso!" });
      }
    } catch (err) {
      toast({ title: "Erro ao gerar EAN-13", variant: "destructive" });
    } finally {
      setIsGeneratingGtin(false);
    }
  };

  // Gerenciamento de Especificações
  const addSpecification = () => {
    setSpecifications([...specifications, { key: '', value: '' }]);
  };

  const updateSpecification = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...specifications];
    updated[index][field] = value;
    setSpecifications(updated);
  };

  const removeSpecification = (index: number) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };

  // Restauração de Dados Originais
  const handleRestoreOriginal = async () => {
    if (!product) return;
    if (product.original_name) form.setValue('name', product.original_name);
    if (product.original_description) form.setValue('description', product.original_description);
    if (product.original_images && Array.isArray(product.original_images)) {
      const restored = product.original_images.map((url: string, i: number) => ({
        id: `restored-${i}`,
        preview: url,
        url: url,
        isMain: i === 0,
        isUploading: false
      }));
      setImages(restored);
    }
    toast({ title: "Dados originais restaurados!" });
  };

  // Submit Handler Principal
  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      const specificationsObj = specifications.reduce((acc, spec) => {
        if (spec.key && spec.value) acc[spec.key] = spec.value;
        return acc;
      }, {} as Record<string, string>);

      const imageUrls = images.map(img => img.url || img.preview).filter(url => isUsableProductImage(url));
      const mainImageUrl = imageUrls.length > 0 ? imageUrls[0] : null;

      let finalCategoryId = data.category_id;
      if (!finalCategoryId || finalCategoryId === '') {
        try {
          finalCategoryId = await ensureCategory(data.name);
        } catch {}
      }

      let finalGtin = data.gtin_ean13 || null;
      if (!finalGtin) {
        try {
          const { data: remoteGtin } = await supabase.rpc('generate_gtin_ean13');
          if (remoteGtin) finalGtin = remoteGtin;
        } catch {}
      }

      // Sanitizar imagens mídias externas
      let sanitizedImageUrls = [...imageUrls];
      let sanitizedMainImageUrl = mainImageUrl;

      if (imageUrls.some(url => typeof url === 'string' && (url.includes('mlstatic.com') || (!url.includes('product-images') && url.startsWith('http'))))) {
        try {
          const { data: sanitizeRes } = await supabase.functions.invoke('ml-sanitize-image', {
            body: { urls: imageUrls }
          });
          if (sanitizeRes?.sanitizedUrls && Array.isArray(sanitizeRes.sanitizedUrls)) {
            sanitizedImageUrls = sanitizeRes.sanitizedUrls;
            sanitizedMainImageUrl = sanitizedImageUrls[0] || '';
          }
        } catch (sanitizeErr) {
          console.warn('Erro ao sanitizar mídias:', sanitizeErr);
        }
      }

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
        image_url: sanitizedMainImageUrl,
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
        if (!product?.id) productData.approval_status = 'pending_approval';
      }

      let savedProduct;
      if (product?.id) {
        const { data: updated, error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id)
          .select()
          .single();
        if (error) throw error;
        savedProduct = updated;
        toast({ title: "Produto atualizado com sucesso!" });
      } else {
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
        toast({ title: "Produto criado com sucesso!" });
      }

      // Salvar Variações
      if (variants.length > 0 && savedProduct?.id) {
        const variantData = variants.map(v => ({
          product_id: savedProduct.id,
          type: v.type,
          name: v.name,
          value: v.value,
          cost_price: v.costPrice,
          price_modifier: v.priceModifier,
          stock_quantity: v.stockQuantity,
          image_url: v.imageUrl || null,
          active: v.active,
          sku: v.sku ? v.sku.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : null
        }));

        if (product?.id) {
          await supabase.from('product_variants').delete().eq('product_id', product.id);
        }
        await supabase.from('product_variants').insert(variantData);
      }

      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      toast({
        title: "Erro ao salvar produto",
        description: error.message || "Verifique os campos obrigatórios.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tratamento de Erros de Validação: Abre o accordion e rola até a seção com erro
  const onError = (errors: any) => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      toast({
        title: "Existem campos pendentes no formulário",
        description: "Abrindo a seção correspondente para correção.",
        variant: "destructive"
      });

      // Mapeamento de campos para seções
      const fieldSectionMap: Record<string, string> = {
        name: 'basic',
        cost_price: 'pricing',
        price: 'pricing',
        stock_quantity: 'stock',
        min_stock_level: 'stock',
        gtin_ean13: 'basic',
        height: 'dimensions',
        weight: 'dimensions',
      };

      const firstErrorField = errorKeys[0];
      const targetSection = fieldSectionMap[firstErrorField] || 'basic';

      if (!openAccordions.includes(targetSection)) {
        setOpenAccordions(prev => [...prev, targetSection]);
      }

      setActiveSection(targetSection);
      const sectionEl = document.getElementById(`section-${targetSection}`);
      if (sectionEl) {
        sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Status das Seções para a navegação por abas/âncoras
  const formErrors = form.formState.errors;
  const sectionsStatus: Record<string, SectionStatus> = {
    basic: {
      id: 'basic',
      label: 'Básico',
      isComplete: !!form.watch('name') && !!form.watch('sku'),
      hasError: !!formErrors.name || !!formErrors.sku || !!formErrors.gtin_ean13,
      summaryText: `${form.watch('name') || 'Sem nome'} | SKU: ${form.watch('sku') || 'N/A'} | Marca: ${form.watch('brand') || 'New'}`,
    },
    pricing: {
      id: 'pricing',
      label: 'Preços',
      isComplete: (form.watch('cost_price') || 0) > 0,
      hasError: !!formErrors.cost_price || !!formErrors.price,
      summaryText: `Custo R$ ${(form.watch('cost_price') || 0).toFixed(2)} | Venda R$ ${(form.watch('price') || 0).toFixed(2)}`,
    },
    stock: {
      id: 'stock',
      label: 'Estoque',
      isComplete: true,
      hasError: !!formErrors.stock_quantity || !!formErrors.min_stock_level,
      summaryText: `${form.watch('stock_quantity') || 0} unidades | Est. mínimo ${form.watch('min_stock_level') || 5}`,
    },
    images: {
      id: 'images',
      label: 'Imagens',
      isComplete: images.length > 0,
      hasError: false,
      summaryText: `${images.length} imagem(ns) | ${images.filter(i => i.isMain).length > 0 ? '1 Principal' : 'Sem Principal'}`,
    },
    dimensions: {
      id: 'dimensions',
      label: 'Dimensões',
      isComplete: !!dimensions.weight && !!dimensions.height,
      hasError: !!formErrors.height || !!formErrors.weight,
      summaryText: `${dimensions.height || 0}×${dimensions.width || 0}×${dimensions.length || 0} cm | ${dimensions.weight || 0} kg`,
    },
    specs: {
      id: 'specs',
      label: 'Especificações',
      isComplete: specifications.length > 0,
      hasError: false,
      summaryText: `${specifications.length} atributo(s) cadastrado(s)`,
    },
    variants: {
      id: 'variants',
      label: 'Variações',
      isComplete: true,
      hasError: false,
      summaryText: variants.length > 0 ? `${variants.length} variação(ões)` : 'Nenhuma variação',
    },
    settings: {
      id: 'settings',
      label: 'Configurações',
      isComplete: true,
      hasError: false,
      summaryText: `${form.watch('active') ? 'Ativo' : 'Inativo'} | ${form.watch('featured') ? 'Em Destaque' : 'Normal'}`,
    },
  };

  const handleExpandAll = () => {
    setOpenAccordions(['basic', 'pricing', 'stock', 'images', 'dimensions', 'specs', 'variants', 'settings', 'linked_ref', 'history']);
  };

  const handleCollapseAll = () => {
    setOpenAccordions([]);
  };

  // Busca Interna por campo
  const handleInternalSearch = (query: string) => {
    setSearchQuery(query);
    if (!query || query.trim() === '') return;

    const lower = query.toLowerCase();
    const searchMap: Record<string, string> = {
      preço: 'pricing', custo: 'pricing', lucro: 'pricing', margem: 'pricing',
      estoque: 'stock', quantidade: 'stock',
      imagem: 'images', foto: 'images', galeria: 'images',
      peso: 'dimensions', altura: 'dimensions', largura: 'dimensions', dimensões: 'dimensions',
      especificação: 'specs', atributo: 'specs', marca: 'basic', sku: 'basic', ean: 'basic',
    };

    for (const [key, secId] of Object.entries(searchMap)) {
      if (lower.includes(key)) {
        if (!openAccordions.includes(secId)) setOpenAccordions(prev => [...prev, secId]);
        setActiveSection(secId);
        const el = document.getElementById(`section-${secId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
    }
  };

  const mainImageUrl = images.find(i => i.isMain)?.url || images[0]?.preview;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-0 pb-16 bg-muted/10 min-h-screen">
        
        {/* 1. CABEÇALHO STICKY FIXO */}
        <ProductEditHeader
          productName={form.watch('name')}
          sku={form.watch('sku')}
          mainImageUrl={mainImageUrl}
          isSubmitting={isSubmitting}
          isDirty={form.formState.isDirty}
          isExisting={!!product?.id}
          activeStatus={form.watch('active')}
          updatedAt={product?.updated_at}
          onCancel={onCancel}
          onSubmit={form.handleSubmit(onSubmit, onError)}
        />

        {/* 2. BARRA DE NAVEGAÇÃO STICKY E BUSCA */}
        <ProductSectionNavigation
          activeSection={activeSection}
          onSelectSection={(secId) => {
            setActiveSection(secId);
            if (!openAccordions.includes(secId)) setOpenAccordions(prev => [...prev, secId]);
            const el = document.getElementById(`section-${secId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          sectionsStatus={sectionsStatus}
        />

        {/* Campo de Busca Rápida Interna */}
        <div className="max-w-7xl mx-auto px-4 pt-4 pb-2">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar campo (ex: preço, estoque, dimensões, SKU)..."
              value={searchQuery}
              onChange={(e) => handleInternalSearch(e.target.value)}
              className="h-9 text-xs pl-9 bg-background shadow-2xs border-border/60"
            />
          </div>
        </div>

        {/* 3. CONTEÚDO EM ACCORDIONS RECOLHÍVEIS */}
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
          <Accordion
            type="multiple"
            value={openAccordions}
            onValueChange={setOpenAccordions}
            className="space-y-3"
          >
            
            {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS */}
            <AccordionItem value="basic" id="section-basic" className="border rounded-xl bg-background shadow-xs overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                <div className="flex flex-1 items-center justify-between pr-4 text-left min-w-0">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                      <Info className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Informações Básicas</h3>
                      <p className="text-xs text-muted-foreground font-normal truncate max-w-xs sm:max-w-md">
                        {sectionsStatus.basic.summaryText}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-muted shrink-0 hidden sm:inline-flex">
                    Geral
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2 border-t">
                <BasicInfoSection
                  form={form}
                  categories={categories}
                  subcategories={subcategories}
                  selectedCategory={selectedCategoryId}
                  onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
                  onOpenSubcategoryModal={() => setIsSubcategoryModalOpen(true)}
                  onAutoCategorize={handleAutoCategorize}
                  onGenerateGtin={handleGenerateGtin}
                  isGeneratingGtin={isGeneratingGtin}
                />
              </AccordionContent>
            </AccordionItem>

            {/* SEÇÃO 2: PREÇOS */}
            <AccordionItem value="pricing" id="section-pricing" className="border rounded-xl bg-background shadow-xs overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                <div className="flex flex-1 items-center justify-between pr-4 text-left min-w-0">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Preços e Precificação</h3>
                      <p className="text-xs text-muted-foreground font-normal truncate max-w-xs sm:max-w-md">
                        {sectionsStatus.pricing.summaryText}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-muted shrink-0 hidden sm:inline-flex">
                    Comercial
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2 border-t">
                <PricingSection
                  form={form}
                  watchedUseAutoPricing={watchedUseAutoPricing}
                  watchedUseDefaultProfitMargin={watchedUseDefaultMargin}
                  priceBreakdown={priceBreakdown}
                  supplierSettings={supplierSettings}
                />
              </AccordionContent>
            </AccordionItem>

            {/* SEÇÃO 3: ESTOQUE */}
            <AccordionItem value="stock" id="section-stock" className="border rounded-xl bg-background shadow-xs overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                <div className="flex flex-1 items-center justify-between pr-4 text-left min-w-0">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Controle de Estoque</h3>
                      <p className="text-xs text-muted-foreground font-normal truncate max-w-xs sm:max-w-md">
                        {sectionsStatus.stock.summaryText}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-muted shrink-0 hidden sm:inline-flex">
                    Comercial
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2 border-t">
                <StockSection form={form} />
              </AccordionContent>
            </AccordionItem>

            {/* SEÇÃO 4: IMAGENS */}
            <AccordionItem value="images" id="section-images" className="border rounded-xl bg-background shadow-xs overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                <div className="flex flex-1 items-center justify-between pr-4 text-left min-w-0">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Imagens e Galeria</h3>
                      <p className="text-xs text-muted-foreground font-normal truncate max-w-xs sm:max-w-md">
                        {sectionsStatus.images.summaryText}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-muted shrink-0 hidden sm:inline-flex">
                    Conteúdo
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2 border-t">
                <ImagesSection
                  images={images}
                  onImagesChange={setImages}
                  maxImages={10}
                  productId={product?.id}
                />
              </AccordionContent>
            </AccordionItem>

            {/* SEÇÃO 5: DIMENSÕES E PESO */}
            <AccordionItem value="dimensions" id="section-dimensions" className="border rounded-xl bg-background shadow-xs overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                <div className="flex flex-1 items-center justify-between pr-4 text-left min-w-0">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                      <Ruler className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Dimensões e Peso</h3>
                      <p className="text-xs text-muted-foreground font-normal truncate max-w-xs sm:max-w-md">
                        {sectionsStatus.dimensions.summaryText}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-muted shrink-0 hidden sm:inline-flex">
                    Logística
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2 border-t">
                <DimensionsSection
                  dimensions={dimensions}
                  onDimensionsChange={handleDimensionsChange}
                />
              </AccordionContent>
            </AccordionItem>

            {/* SEÇÃO 6: ESPECIFICAÇÕES TÉCNICAS */}
            <AccordionItem value="specs" id="section-specs" className="border rounded-xl bg-background shadow-xs overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                <div className="flex flex-1 items-center justify-between pr-4 text-left min-w-0">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg">
                      <ListChecks className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Especificações Técnicas</h3>
                      <p className="text-xs text-muted-foreground font-normal truncate max-w-xs sm:max-w-md">
                        {sectionsStatus.specs.summaryText}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-muted shrink-0 hidden sm:inline-flex">
                    Conteúdo
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2 border-t">
                <SpecificationsSection
                  specifications={specifications}
                  onAddSpecification={addSpecification}
                  onUpdateSpecification={updateSpecification}
                  onRemoveSpecification={removeSpecification}
                />
              </AccordionContent>
            </AccordionItem>

            {/* SEÇÃO 7: VARIAÇÕES */}
            <AccordionItem value="variants" id="section-variants" className="border rounded-xl bg-background shadow-xs overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                <div className="flex flex-1 items-center justify-between pr-4 text-left min-w-0">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-2 bg-pink-500/10 text-pink-600 rounded-lg">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Variações do Produto</h3>
                      <p className="text-xs text-muted-foreground font-normal truncate max-w-xs sm:max-w-md">
                        {sectionsStatus.variants.summaryText}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-muted shrink-0 hidden sm:inline-flex">
                    Variações
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2 border-t">
                <VariantsManager
                  variants={variants}
                  onVariantsChange={setVariants}
                  platformSettings={settings}
                  productCostPrice={Number(watchedCostPrice) || 0}
                  useAutoPricing={!!watchedUseAutoPricing}
                />
              </AccordionContent>
            </AccordionItem>

            {/* SEÇÃO 8: CONFIGURAÇÕES */}
            <AccordionItem value="settings" id="section-settings" className="border rounded-xl bg-background shadow-xs overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                <div className="flex flex-1 items-center justify-between pr-4 text-left min-w-0">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-2 bg-slate-500/10 text-slate-600 rounded-lg">
                      <Settings className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Configurações de Exibição</h3>
                      <p className="text-xs text-muted-foreground font-normal truncate max-w-xs sm:max-w-md">
                        {sectionsStatus.settings.summaryText}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-muted shrink-0 hidden sm:inline-flex">
                    Sistema
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2 border-t">
                <SettingsSection form={form} />
              </AccordionContent>
            </AccordionItem>

            {/* SEÇÃO 9: REFERÊNCIA VINCULADA (Se existir dados do ML) */}
            {(product?.reference_ad_url || product?.original_name) && (
              <AccordionItem value="linked_ref" id="section-linked_ref" className="border rounded-xl bg-background shadow-xs overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex flex-1 items-center justify-between pr-4 text-left min-w-0">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                        <Link2 className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Anúncio de Referência Vinculado</h3>
                        <p className="text-xs text-muted-foreground font-normal truncate max-w-xs sm:max-w-md">
                          Mercado Livre Vinculado
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-muted shrink-0 hidden sm:inline-flex">
                      Sistema
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2 border-t">
                  <LinkedReferenceSection
                    referenceUrl={product?.reference_ad_url}
                    originalName={product?.original_name}
                    originalPrice={product?.original_price}
                    onRestoreOriginal={handleRestoreOriginal}
                  />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* SEÇÃO 10: HISTÓRICO DE IMPORTAÇÕES (Se existir) */}
            {product?.original_saved_at && (
              <AccordionItem value="history" id="section-history" className="border rounded-xl bg-background shadow-xs overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex flex-1 items-center justify-between pr-4 text-left min-w-0">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                        <History className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Histórico de Versões e Registro</h3>
                        <p className="text-xs text-muted-foreground font-normal truncate max-w-xs sm:max-w-md">
                          1 versão original registrada
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-muted shrink-0 hidden sm:inline-flex">
                      Sistema
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2 border-t">
                  <HistorySection
                    originalSavedAt={product?.original_saved_at}
                    onRestoreOriginal={handleRestoreOriginal}
                  />
                </AccordionContent>
              </AccordionItem>
            )}

          </Accordion>
        </div>

        {/* 4. BARRA DE AÇÕES FIXA INFERIOR */}
        <StickySaveBar
          isSubmitting={isSubmitting}
          isDirty={form.formState.isDirty}
          isExisting={!!product?.id}
          errorCount={Object.keys(formErrors).length}
          onCancel={onCancel}
          onSubmit={form.handleSubmit(onSubmit, onError)}
          onScrollToFirstError={() => onError(formErrors)}
        />

        {/* Modais de Criação */}
        <CategoryCreationModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onCategoryCreated={(newCatId) => {
            form.setValue('category_id', newCatId);
            queryClient.invalidateQueries({ queryKey: ['categories'] });
          }}
        />

        <SubcategoryCreationModal
          isOpen={isSubcategoryModalOpen}
          onClose={() => setIsSubcategoryModalOpen(false)}
          categoryId={selectedCategoryId}
          onSubcategoryCreated={(newSubcatId) => {
            form.setValue('subcategory_id', newSubcatId);
            queryClient.invalidateQueries({ queryKey: ['subcategories', selectedCategoryId] });
          }}
        />

      </form>
    </Form>
  );
};

export default ProductForm;