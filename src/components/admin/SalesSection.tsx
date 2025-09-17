import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Eye } from 'lucide-react';
import { useTopProducts } from '@/hooks/useTopProducts';

// Mock sales data for the chart
const salesData = [
  { date: '01/01', vendas: 1200 },
  { date: '02/01', vendas: 1900 },
  { date: '03/01', vendas: 800 },
  { date: '04/01', vendas: 2400 },
  { date: '05/01', vendas: 1000 },
  { date: '06/01', vendas: 3200 },
  { date: '07/01', vendas: 2100 }
];

// Mock most viewed products data
const mostViewedProducts = [
  { id: '1', name: 'Smartphone Premium', views: 1520, image_url: '/product-phone.jpg' },
  { id: '2', name: 'Notebook Gamer', views: 1234, image_url: '/product-laptop.jpg' },
  { id: '3', name: 'Headphone Bluetooth', views: 987, image_url: '/product-headphones.jpg' },
  { id: '4', name: 'Smartwatch Fitness', views: 856, image_url: '/product-watch.jpg' },
  { id: '5', name: 'Tablet Pro', views: 723, image_url: '/product-phone.jpg' }
];

export const SalesSection = () => {
  const { data: topProducts, isLoading } = useTopProducts();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Vendas
        </CardTitle>
        <CardDescription>
          Desempenho de vendas e produtos mais populares
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Sales Chart */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Vendas dos Últimos 7 Dias</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`R$ ${value}`, 'Vendas']}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Bar dataKey="vendas" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Product Tabs */}
          <Tabs defaultValue="most-sold" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="most-sold">Mais Vendidos</TabsTrigger>
              <TabsTrigger value="most-viewed">Mais Visualizados</TabsTrigger>
            </TabsList>
            
            <TabsContent value="most-sold" className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-muted-foreground mt-2 text-sm">Carregando...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topProducts?.slice(0, 5).map((product, index) => (
                    <div key={product.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                      <Badge variant="secondary" className="text-xs font-bold">
                        #{index + 1}
                      </Badge>
                      <img 
                        src={product.main_image_url || product.image_url || '/placeholder.svg'} 
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.total_sales} vendas • R$ {product.price.toFixed(2)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        R$ {product.avg_profit.toFixed(2)} lucro médio
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="most-viewed" className="space-y-4">
              <div className="space-y-3">
                {mostViewedProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                    <Badge variant="secondary" className="text-xs font-bold">
                      #{index + 1}
                    </Badge>
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {product.views} visualizações
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
};