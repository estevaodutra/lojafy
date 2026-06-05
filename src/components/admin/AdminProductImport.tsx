import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Loader2, 
  ExternalLink, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Calculator, 
  DollarSign, 
  Percent, 
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';

interface AdminProductImportProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AdminProductImport({ onSuccess, onCancel }: AdminProductImportProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search & Link states
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [originalListing, setOriginalListing] = useState<any>(null);

  // Flow step state: 'search' | 'adjust'
  const [step, setStep] = useState<'search' | 'adjust'>('search');

  // Selected item full data states
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [description, setDescription] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [sku, setSku] = useState('');
  const [gtin, setGtin] = useState('');
  const [stock, setStock] = useState('10');
  const [images, setImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [mainImageUrl, setMainImageUrl] = useState('');

  // Listing configuration for Mercado Livre integration
  const [listingType, setListingType] = useState('gold_special');
  const [condition, setCondition] = useState('new');
  const [freeShipping, setFreeShipping] = useState(false);

  // Fetch local Lojafy categories
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

  // Extract Mercado Livre Item ID from URL
  const extractItemId = (text: string): string | null => {
    const regex = /(MLB-?\d+)/i;
    const match = text.match(regex);
    if (match) {
      return match[1].replace('-', '');
    }
    return null;
  };

  // Execute search or URL fetch
  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setOriginalListing(null);

    const itemId = extractItemId(query);

    try {
      if (itemId) {
        // Fetch details of specific item
        const itemRes = await fetch(`https://api.mercadolibre.com/items/${itemId}`);
        if (!itemRes.ok) throw new Error('Anúncio não encontrado ou inválido.');
        const itemData = await itemRes.json();

        // Convert thumbnail HTTP to HTTPS
        if (itemData.thumbnail) {
          itemData.thumbnail = itemData.thumbnail.replace(/^http:/, 'https:');
        }

        setOriginalListing(itemData);

        // Fetch similar items using the title of this item
        const similarRes = await fetch(
          `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(itemData.title)}&limit=6`
        );
        if (similarRes.ok) {
          const similarData = await similarRes.json();
          // Filter out the original item from similar list
          const filteredResults = (similarData.results || []).filter((r: any) => r.id !== itemData.id);
          setSearchResults(filteredResults);
        }
      } else {
        // Direct search
        const searchRes = await fetch(
          `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}&limit=8`
        );
        if (!searchRes.ok) throw new Error('Falha ao buscar anúncios.');
        const searchData = await searchRes.json();
        setSearchResults(searchData.results || []);
      }
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro na busca',
        description: error.message || 'Verifique o link ou termo digitado.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Fetch full details of the selected item to populate the form
  const handleSelectItem = async (item: any) => {
    setIsSearching(true);
    try {
      // Fetch full details (images, specifications)
      const detailRes = await fetch(`https://api.mercadolibre.com/items/${item.id}`);
      if (!detailRes.ok) throw new Error('Falha ao carregar detalhes do anúncio.');
      const detailData = await detailRes.json();

      // Fetch description
      let descText = '';
      try {
        const descRes = await fetch(`https://api.mercadolibre.com/items/${item.id}/description`);
        if (descRes.ok) {
          const descData = await descRes.json();
          descText = descData.plain_text || descData.text || '';
        }
      } catch (e) {
        console.warn('Could not fetch description, using fallback', e);
      }

      setSelectedItem(detailData);
      setDescription(descText);

      // Populate Form Fields
      setName(detailData.title.substring(0, 60)); // Limit to 60 chars
      setPrice(String(detailData.price));
      setCostPrice(''); // Empty, admin must specify

      // SKU and GTIN (EAN)
      const brandAttr = detailData.attributes?.find((a: any) => a.id === 'BRAND')?.value_name || '';
      const modelAttr = detailData.attributes?.find((a: any) => a.id === 'MODEL')?.value_name || '';
      const partNumAttr = detailData.attributes?.find((a: any) => a.id === 'PART_NUMBER')?.value_name || '';
      const eanAttr = detailData.attributes?.find((a: any) => a.id === 'GTIN')?.value_name || '';

      setBrand(brandAttr);
      setModel(modelAttr);
      setPartNumber(partNumAttr);
      setGtin(eanAttr);

      // Auto-generate a sku if not found
      const cleanBrand = brandAttr ? brandAttr.replace(/\s+/g, '-').toUpperCase() : 'AUTO';
      const cleanModel = modelAttr ? modelAttr.replace(/\s+/g, '-').toUpperCase() : 'ML';
      const randomId = Math.random().toString(36).substring(2, 6).toUpperCase();
      setSku(`${cleanBrand}-${cleanModel}-${randomId}`);

      // Map categories
      if (categories.length > 0) {
        // Try simple name matching
        const matchingCategory = categories.find(
          c => c.name.toLowerCase().includes(brandAttr.toLowerCase()) || 
               brandAttr.toLowerCase().includes(c.name.toLowerCase())
        );
        setCategoryId(matchingCategory?.id || categories[0].id);
      }

      // Map Images
      const imgUrls = (detailData.pictures || []).map((pic: any) => pic.secure_url || pic.url);
      setImages(imgUrls);
      setSelectedImages(new Set(imgUrls)); // Check all by default
      setMainImageUrl(imgUrls[0] || '');

      setStep('adjust');
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao selecionar anúncio',
        description: error.message,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleImageToggle = (url: string) => {
    setSelectedImages(prev => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
        // If we deleted the main image, choose another one
        if (mainImageUrl === url) {
          const remaining = Array.from(next);
          setMainImageUrl(remaining[0] || '');
        }
      } else {
        next.add(url);
        if (!mainImageUrl) setMainImageUrl(url);
      }
      return next;
    });
  };

  // Calculations for Admin Profit & Margin
  const sellPriceNum = parseFloat(price) || 0;
  const costPriceNum = parseFloat(costPrice) || 0;
  
  // Mercado Livre Commission Rules
  const mlCommissionPercent = listingType === 'gold_pro' ? 0.195 : 0.14; // 19.5% Premium, 14% Classic
  const mlFixedFee = sellPriceNum < 79 && sellPriceNum > 0 ? 6.00 : 0.00; // R$ 6.00 fee below R$ 79
  
  const mlCommissionVal = sellPriceNum * mlCommissionPercent;
  const totalFees = mlCommissionVal + mlFixedFee;
  const netRevenue = sellPriceNum - totalFees;
  const profit = sellPriceNum - costPriceNum - totalFees;
  const marginPercent = sellPriceNum > 0 ? (profit / sellPriceNum) * 100 : 0;
  const markupPercent = costPriceNum > 0 ? (profit / costPriceNum) * 100 : 0;

  // Mutation to insert product
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Nome do produto é obrigatório.');
      if (!costPrice || isNaN(costPriceNum) || costPriceNum <= 0) {
        throw new Error('Preço de custo deve ser maior que zero.');
      }
      if (!price || isNaN(sellPriceNum) || sellPriceNum <= 0) {
        throw new Error('Preço de venda deve ser maior que zero.');
      }
      if (!categoryId) throw new Error('Selecione uma categoria.');

      const activeImages = images.filter(url => selectedImages.has(url));

      // 1. Prepare product payload
      const productPayload = {
        name,
        description: description || null,
        price: sellPriceNum,
        cost_price: costPriceNum,
        category_id: categoryId,
        brand: brand || null,
        sku: sku || `SKU-${Date.now()}`,
        gtin_ean13: gtin || null,
        stock_quantity: parseInt(stock) || 0,
        min_stock_level: 5,
        main_image_url: mainImageUrl || activeImages[0] || null,
        image_url: mainImageUrl || activeImages[0] || null,
        images: activeImages,
        active: true,
        featured: false,
        approval_status: 'approved', // Superadmin products are auto-approved
        original_name: selectedItem?.title || name,
        original_description: description || null,
        original_images: images,
        original_saved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 2. Insert product
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert(productPayload)
        .select()
        .single();

      if (productError) throw productError;

      // 3. Prepare product marketplace data configuration
      const validatedBody = {
        category_id: selectedItem?.category_id || 'MLB1051',
        listing_type_id: listingType,
        condition: condition,
        shipping: {
          mode: 'me2',
          free_shipping: freeShipping
        },
        attributes: [
          ...(brand ? [{ id: 'BRAND', name: 'Marca', value_name: brand }] : []),
          ...(model ? [{ id: 'MODEL', name: 'Modelo', value_name: model }] : []),
          ...(partNumber ? [{ id: 'PART_NUMBER', name: 'Número de peça', value_name: partNumber }] : []),
        ]
      };

      const { error: mpError } = await supabase
        .from('product_marketplace_data')
        .insert({
          product_id: newProduct.id,
          marketplace: 'mercadolivre',
          validated_body: validatedBody,
          is_validated: true,
          validated_at: new Date().toISOString(),
          listing_status: 'draft',
          updated_at: new Date().toISOString(),
        });

      if (mpError) {
        console.error('Error inserting marketplace config:', mpError);
        // Do not crash the entire process, product is already created
      }

      return newProduct;
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso!',
        description: 'Produto cadastrado e configurado para o Mercado Livre.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      onSuccess();
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar',
        description: err.message || 'Verifique as informações fornecidas.',
      });
    }
  });

  return (
    <div className="space-y-6 py-4">
      {/* ── STEP 1: SEARCH & SELECT ────────────────────────────────────────── */}
      {step === 'search' && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cole o link do Mercado Livre ou digite palavras-chave (ex: Amortecedor Monroe Civic)..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9 pr-4"
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
            </Button>
          </div>

          {isSearching && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Buscando anúncios no Mercado Livre...</p>
            </div>
          )}

          {!isSearching && (originalListing || searchResults.length > 0) && (
            <div className="space-y-6">
              {/* Original Listing from URL */}
              {originalListing && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-primary flex items-center gap-1">
                    🎯 Link Detectado
                  </h3>
                  <Card className="border-primary/40 bg-primary/5">
                    <CardContent className="p-4 flex gap-4 items-center flex-wrap sm:flex-nowrap">
                      {originalListing.thumbnail ? (
                        <img 
                          src={originalListing.thumbnail} 
                          alt="" 
                          className="w-20 h-20 object-cover rounded border bg-background flex-shrink-0" 
                        />
                      ) : (
                        <div className="w-20 h-20 bg-muted rounded flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base line-clamp-2">{originalListing.title}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {originalListing.id}
                          </Badge>
                          <span className="text-lg font-bold text-primary">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalListing.price)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {originalListing.sold_quantity || 0} vendidos
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => window.open(originalListing.permalink, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => handleSelectItem(originalListing)}>
                          Importar Anúncio
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Search Results / Similar Items */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {originalListing ? 'Anúncios Similares Encontrados' : 'Resultados da Busca'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map(item => (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex gap-3 items-center">
                        <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0 border">
                          {item.thumbnail ? (
                            <img 
                              src={item.thumbnail.replace(/^http:/, 'https:')} 
                              alt="" 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2" title={item.title}>{item.title}</p>
                          <div className="flex items-center justify-between mt-1 flex-wrap gap-1">
                            <span className="text-sm font-bold text-primary">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                            </span>
                            <span className="text-xs text-muted-foreground">{item.sold_quantity || 0} vendas</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 self-end"
                            onClick={() => window.open(item.permalink, '_blank')}
                          >
                            <ExternalLink className="h-4.5 w-4.5 text-muted-foreground" />
                          </Button>
                          <Button size="sm" onClick={() => handleSelectItem(item)} className="px-2 h-8">
                            Importar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isSearching && query.trim() && searchResults.length === 0 && !originalListing && (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-45" />
              <p>Nenhum anúncio correspondente encontrado.</p>
              <p className="text-xs">Tente buscar por outras palavras-chave ou confira o link do produto.</p>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: FORM ADJUSTMENTS & CALCULATOR ──────────────────────────── */}
      {step === 'adjust' && selectedItem && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Editing Fields */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep('search')} className="p-0 hover:bg-transparent">
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar para busca
              </Button>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-xs text-muted-foreground">Original: {selectedItem.id}</span>
            </div>

            {/* Basic Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dados Básicos do Produto</CardTitle>
                <CardDescription>Ajuste os dados principais para exibição na loja</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Label htmlFor="title">Título do Produto *</Label>
                    <span className={`text-xs ${name.length > 60 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                      {name.length}/60
                    </span>
                  </div>
                  <Input 
                    id="title" 
                    value={name} 
                    onChange={e => setName(e.target.value.substring(0, 80))} // Keep reasonable len
                    placeholder="Título do anúncio..."
                  />
                  {name.length > 60 && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      O título excede 60 caracteres e pode ser truncado pelo Mercado Livre.
                    </p>
                  )}
                </div>

                {/* Category mapping */}
                <div className="space-y-1">
                  <Label htmlFor="category">Categoria Lojafy (Catálogo)</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria no sistema..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="sku">SKU (Código Interno)</Label>
                    <Input id="sku" value={sku} onChange={e => setSku(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="gtin">GTIN / EAN-13 (Cód. Barras)</Label>
                    <Input id="gtin" value={gtin} onChange={e => setGtin(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="brand">Marca</Label>
                    <Input id="brand" value={brand} onChange={e => setBrand(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="model">Modelo</Label>
                    <Input id="model" value={model} onChange={e => setModel(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="partNumber">Número de Peça</Label>
                    <Input id="partNumber" value={partNumber} onChange={e => setPartNumber(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="stock">Estoque Inicial</Label>
                    <Input id="stock" type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <Label htmlFor="description">Descrição do Produto</Label>
                  <Textarea 
                    id="description" 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    rows={8}
                    placeholder="Descrição técnica..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Mercado Livre sync settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Preparações para Mercado Livre</CardTitle>
                <CardDescription>Configure como o anúncio será publicado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Tipo de Anúncio</Label>
                    <Select value={listingType} onValueChange={setListingType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gold_special">Gold Special (Clássico - 14% taxa)</SelectItem>
                        <SelectItem value="gold_pro">Gold Pro (Premium - 19.5% taxa)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Condição</Label>
                    <Select value={condition} onValueChange={setCondition}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Novo</SelectItem>
                        <SelectItem value="used">Usado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Oferecer Frete Grátis</Label>
                    <p className="text-xs text-muted-foreground">O custo do frete será cobrado de você</p>
                  </div>
                  <Switch checked={freeShipping} onCheckedChange={setFreeShipping} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: sticky actions, calculations, images */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-4">
            
            {/* Image Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Imagens do Anúncio ({selectedImages.size}/{images.length})</CardTitle>
                <CardDescription>Escolha as imagens que deseja importar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {images.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((url, idx) => {
                      const isSelected = selectedImages.has(url);
                      const isMain = mainImageUrl === url;
                      return (
                        <div 
                          key={idx} 
                          className={`relative border rounded overflow-hidden aspect-square cursor-pointer transition-all ${isSelected ? 'border-primary shadow' : 'opacity-40 border-muted'}`}
                          onClick={() => handleImageToggle(url)}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <div className="absolute top-1 left-1">
                            <Checkbox checked={isSelected} readOnly className="pointer-events-none rounded bg-background" />
                          </div>
                          {isMain && isSelected && (
                            <Badge className="absolute bottom-1 right-1 px-1 py-0 h-4 text-[9px] bg-primary text-white">
                              Capa
                            </Badge>
                          )}
                          {isSelected && !isMain && (
                            <button
                              type="button"
                              className="absolute bottom-1 right-1 px-1 py-0 h-4 text-[9px] bg-muted hover:bg-primary hover:text-white rounded text-muted-foreground font-medium"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMainImageUrl(url);
                              }}
                            >
                              Fazer Capa
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Sem imagens para importar.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Calculator */}
            <Card className="border-primary/20">
              <CardHeader className="pb-3 bg-primary/5">
                <CardTitle className="text-base flex items-center gap-1.5">
                  <Calculator className="h-4.5 w-4.5 text-primary" />
                  Calculadora Financeira
                </CardTitle>
                <CardDescription>Ajuste preços e veja as margens em tempo real</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="cost_price" className="font-semibold text-primary">Preço de Custo *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="cost_price"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={costPrice}
                        onChange={e => setCostPrice(e.target.value)}
                        placeholder="0.00"
                        className="pl-7 font-medium border-primary/40 focus-visible:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sell_price" className="font-semibold">Preço de Venda *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="sell_price"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        placeholder="0.00"
                        className="pl-7 font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-muted/40 rounded-lg p-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Comissão ML ({mlCommissionPercent * 100}%):</span>
                    <span className="font-medium">R$ {mlCommissionVal.toFixed(2)}</span>
                  </div>
                  {mlFixedFee > 0 && (
                    <div className="flex justify-between text-warning-foreground">
                      <span className="text-muted-foreground">Taxa Fixa ML (anúncios &lt; R$79):</span>
                      <span className="font-medium text-warning font-semibold">R$ {mlFixedFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1.5 mt-1">
                    <span className="text-muted-foreground">Receita Líquida (após taxas ML):</span>
                    <span className="font-semibold">R$ {netRevenue.toFixed(2)}</span>
                  </div>
                  <Separator className="my-1" />
                  
                  {/* PROFIT & MARGIN DISPLAY */}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-bold">Lucro Estimado:</span>
                    <span className={`text-base font-extrabold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      R$ {profit.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Margem de Lucro:</span>
                    <span className={`font-semibold ${profit >= 0 ? 'text-green-700' : 'text-red-500'}`}>
                      {marginPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Markup (Sobre o Custo):</span>
                    <span className={`font-semibold ${profit >= 0 ? 'text-green-700' : 'text-red-500'}`}>
                      {markupPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Submitting Actions */}
                <div className="space-y-2 pt-2">
                  <Button 
                    className="w-full h-11 text-base gap-2"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || !costPrice || costPriceNum <= 0 || sellPriceNum <= 0}
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        Confirmar e Cadastrar
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={onCancel}
                    disabled={saveMutation.isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      )}
    </div>
  );
}
