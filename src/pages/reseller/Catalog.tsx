import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Plus, Calculator, Package, Star, TrendingUp } from 'lucide-react';

const ResellerCatalog = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('all');

  const products = [
    {
      id: 1,
      name: "Smartphone Galaxy Pro Max",
      image: "/api/placeholder/300/300",
      cost: 1200,
      suggestedPrice: 1499,
      margin: 24.9,
      category: "Eletrônicos",
      brand: "TechBrand",
      stock: 45,
      rating: 4.8,
      sales: 234,
      highRotation: true,
      sku: "ELTR-GALX-001"
    },
    {
      id: 2,
      name: "Notebook Gaming Ultra 16GB",
      image: "/api/placeholder/300/300", 
      cost: 2200,
      suggestedPrice: 2899,
      margin: 31.8,
      category: "Informática",
      brand: "GameTech",
      stock: 12,
      rating: 4.9,
      sales: 156,
      highRotation: true,
      sku: "INFO-GAME-002"
    },
    {
      id: 3,
      name: "Headphone Wireless Premium",
      image: "/api/placeholder/300/300",
      cost: 150,
      suggestedPrice: 299,
      margin: 99.3,
      category: "Áudio",
      brand: "SoundMax",
      stock: 78,
      rating: 4.6,
      sales: 89,
      highRotation: false,
      sku: "AUDIO-PREM-003"
    },
    {
      id: 4,
      name: "Smartwatch Fitness Pro",
      image: "/api/placeholder/300/300",
      cost: 180,
      suggestedPrice: 349,
      margin: 93.9,
      category: "Wearables",
      brand: "FitTech",
      stock: 34,
      rating: 4.7,
      sales: 67,
      highRotation: false,
      sku: "WEAR-FITP-004"
    }
  ];

  const categories = ["Todos", "Eletrônicos", "Informática", "Áudio", "Wearables"];
  const priceRanges = [
    { value: "all", label: "Todos os preços" },
    { value: "0-500", label: "Até R$ 500" },
    { value: "500-1000", label: "R$ 500 - R$ 1.000" },
    { value: "1000-2000", label: "R$ 1.000 - R$ 2.000" },
    { value: "2000+", label: "Acima de R$ 2.000" }
  ];

  const getMarginColor = (margin: number) => {
    if (margin >= 50) return "text-green-600 bg-green-50";
    if (margin >= 30) return "text-blue-600 bg-blue-50";
    return "text-orange-600 bg-orange-50";
  };

  const getStockColor = (stock: number) => {
    if (stock > 20) return "text-green-600";
    if (stock > 5) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Catálogo de Produtos</h1>
        <p className="text-muted-foreground">
          Explore produtos disponíveis para revenda e adicione à sua loja
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.247</div>
            <p className="text-xs text-muted-foreground">
              +23 novos esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Na Minha Loja</CardTitle>
            <Plus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87</div>
            <p className="text-xs text-muted-foreground">
              produtos ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem Média</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42%</div>
            <p className="text-xs text-muted-foreground">
              nos produtos ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alto Giro</CardTitle>
            <Star className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">
              produtos em destaque
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos por nome ou SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category.toLowerCase()}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Faixa de Preço" />
              </SelectTrigger>
              <SelectContent>
                {priceRanges.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="relative">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-lg"
                />
                {product.highRotation && (
                  <Badge className="absolute top-2 left-2 bg-orange-500 hover:bg-orange-600">
                    <Star className="h-3 w-3 mr-1" />
                    Alto Giro
                  </Badge>
                )}
                <Badge 
                  variant="secondary" 
                  className="absolute top-2 right-2"
                >
                  {product.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
                <CardDescription>
                  {product.brand} • SKU: {product.sku}
                </CardDescription>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Custo</p>
                  <p className="font-medium">R$ {product.cost.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Preço Sugerido</p>
                  <p className="font-medium">R$ {product.suggestedPrice.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge className={getMarginColor(product.margin)}>
                    {product.margin}% margem
                  </Badge>
                  <span className={`text-sm ${getStockColor(product.stock)}`}>
                    {product.stock} em estoque
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm">{product.rating}</span>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {product.sales} vendas no último mês
              </div>

              <div className="flex space-x-2">
                <Button className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar à Loja
                </Button>
                <Button variant="outline" size="icon">
                  <Calculator className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Margin Calculator */}
      <Card>
        <CardHeader>
          <CardTitle>Calculadora de Margem</CardTitle>
          <CardDescription>
            Calcule sua margem de lucro e preço final
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Preço de Custo</label>
              <Input type="number" placeholder="R$ 0,00" />
            </div>
            <div>
              <label className="text-sm font-medium">Margem Desejada (%)</label>
              <Input type="number" placeholder="30%" />
            </div>
            <div>
              <label className="text-sm font-medium">Preço Final</label>
              <Input type="number" placeholder="R$ 0,00" disabled />
            </div>
            <div className="flex items-end">
              <Button className="w-full">
                <Calculator className="h-4 w-4 mr-2" />
                Calcular
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResellerCatalog;