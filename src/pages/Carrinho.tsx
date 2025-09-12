import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

const Carrinho = () => {
  const { items, itemsCount, totalPrice, updateQuantity, removeItem, clearCart, syncPrices, isUpdatingPrices } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantity(productId, newQuantity);
  };

  const handleRemoveItem = (productId: string, productName: string) => {
    removeItem(productId);
    toast({
      title: "Produto removido",
      description: `${productName} foi removido do carrinho`,
    });
  };

  const handleClearCart = () => {
    clearCart();
    toast({
      title: "Carrinho limpo",
      description: "Todos os produtos foram removidos do carrinho",
    });
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    navigate('/checkout');
  };

  const handleSyncPrices = async () => {
    const result = await syncPrices();
    
    if (result.updated) {
      if (result.updatedItems.length > 0) {
        toast({
          title: "Preços atualizados!",
          description: `${result.updatedItems.length} produto(s) tiveram preços alterados: ${result.updatedItems.join(', ')}`,
        });
      } else {
        toast({
          title: "Carrinho atualizado",
          description: "Alguns produtos foram removidos pois não estão mais disponíveis",
        });
      }
    } else {
      toast({
        title: "Preços atualizados",
        description: "Todos os preços estão em dia!",
      });
    }
  };

  const shippingThreshold = 199;
  const freeShipping = totalPrice >= shippingThreshold;
  const shippingCost = freeShipping ? 0 : 29.90;
  const finalTotal = totalPrice + shippingCost;

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-32 h-32 bg-muted rounded-full flex items-center justify-center mb-6">
                <ShoppingBag className="w-16 h-16 text-muted-foreground" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4">
                Seu carrinho está vazio
              </h1>
              <p className="text-muted-foreground mb-8 max-w-md">
                Parece que você ainda não adicionou nenhum produto ao seu carrinho. 
                Que tal dar uma olhada em nossos produtos?
              </p>
              <Button asChild size="lg">
                <Link to="/">
                  Continuar Comprando
                </Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Meu Carrinho</h1>
                <p className="text-muted-foreground">
                  {itemsCount} {itemsCount === 1 ? 'item' : 'itens'} no carrinho
                </p>
              </div>
            </div>
            {items.length > 0 && (
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={handleSyncPrices}
                  disabled={isUpdatingPrices}
                >
                  {isUpdatingPrices ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Atualizar preços
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleClearCart}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar Carrinho
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.productId} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-24 h-24 object-cover rounded-lg bg-muted"
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex-grow space-y-2">
                        <Link 
                          to={`/produto/${item.productId}`}
                          className="block hover:text-primary transition-colors"
                        >
                          <h3 className="font-semibold text-lg">{item.productName}</h3>
                        </Link>
                        
                        {item.variants && Object.keys(item.variants).length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(item.variants).map(([key, value]) => (
                              <Badge key={key} variant="secondary" className="text-xs">
                                {key}: {value}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <p className="text-2xl font-bold text-primary">
                          {formatPrice(item.price)}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex flex-col items-center space-y-4">
                        <div className="flex items-center space-x-3 bg-muted rounded-lg p-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-12 text-center font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.productId, item.productName)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Item Total */}
                      <div className="text-right">
                        <p className="text-xl font-bold">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-8">
                <CardContent className="p-6 space-y-6">
                  <h2 className="text-xl font-bold">Resumo do Pedido</h2>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal ({itemsCount} itens)</span>
                      <span className="font-medium">{formatPrice(totalPrice)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frete</span>
                      <span className={`font-medium ${freeShipping ? 'text-success' : ''}`}>
                        {freeShipping ? 'GRÁTIS' : formatPrice(shippingCost)}
                      </span>
                    </div>

                    {!freeShipping && (
                      <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
                        <p className="text-sm text-warning-foreground">
                          Faltam {formatPrice(shippingThreshold - totalPrice)} para frete grátis!
                        </p>
                      </div>
                    )}

                    <Separator />
                    
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">{formatPrice(finalTotal)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button 
                      onClick={handleCheckout}
                      className="w-full" 
                      size="lg"
                    >
                      Finalizar Compra
                    </Button>
                    
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/">
                        Continuar Comprando
                      </Link>
                    </Button>
                  </div>

                  <div className="text-center pt-4">
                    <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                      <div className="w-4 h-4 bg-success rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                      <span>Compra 100% segura</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Carrinho;