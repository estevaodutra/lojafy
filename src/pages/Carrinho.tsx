import { useState, useEffect } from 'react';
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
  const {
    items,
    itemsCount,
    totalPrice,
    updateQuantity,
    removeItem,
    clearCart,
    syncPrices,
    isUpdatingPrices,
    lastSyncTime,
    storeSlug
  } = useCart();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();

  // Redirect to public store cart if there's a store context
  useEffect(() => {
    if (storeSlug && items.length > 0) {
      console.log('🔄 Redirecting to public store cart:', storeSlug);
      navigate(`/loja/${storeSlug}/carrinho`, {
        replace: true
      });
    }
  }, [storeSlug, items.length, navigate]);
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };
  const formatLastSync = () => {
    if (!lastSyncTime) return null;
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastSyncTime.getTime()) / (1000 * 60));
    if (diffInMinutes === 0) return 'Agora mesmo';
    if (diffInMinutes === 1) return 'Há 1 minuto';
    if (diffInMinutes < 60) return `Há ${diffInMinutes} minutos`;
    if (diffInMinutes < 1440) return `Há ${Math.floor(diffInMinutes / 60)} horas`;
    return lastSyncTime.toLocaleDateString('pt-BR');
  };
  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantity(productId, newQuantity);
  };
  const handleRemoveItem = (productId: string, productName: string) => {
    removeItem(productId);
    toast({
      title: "Produto removido",
      description: `${productName} foi removido do carrinho`
    });
  };
  const handleClearCart = () => {
    clearCart();
    toast({
      title: "Carrinho limpo",
      description: "Todos os produtos foram removidos do carrinho"
    });
  };
  const handleCheckout = () => {
    if (items.length === 0) return;
    navigate('/checkout');
  };
  const handleSyncPrices = async () => {
    const result = await syncPrices();
    if (result.updated) {
      let message = '';
      const changes = [];
      if (result.updatedItems.length > 0) {
        changes.push(`${result.updatedItems.length} produto(s) com preços atualizados`);
      }
      if (result.removedItems.length > 0) {
        changes.push(`${result.removedItems.length} produto(s) removidos (indisponíveis)`);
      }
      message = changes.join(' e ');
      toast({
        title: "Carrinho atualizado!",
        description: message,
        variant: result.removedItems.length > 0 ? "destructive" : "default"
      });
    } else {
      toast({
        title: "✅ Tudo em dia!",
        description: "Todos os preços e produtos estão atualizados"
      });
    }
  };
  const shippingThreshold = 199;
  const freeShipping = totalPrice >= shippingThreshold;
  const shippingCost = freeShipping ? 0 : 29.90;
  const finalTotal = totalPrice + shippingCost;
  if (items.length === 0) {
    return <>
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
      </>;
  }
  return <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center space-x-4 min-w-0">
              <Button variant="ghost" size="sm" asChild className="flex-shrink-0">
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Link>
              </Button>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">Meu Carrinho</h1>
                <p className="text-muted-foreground">
                  {itemsCount} {itemsCount === 1 ? 'item' : 'itens'} no carrinho
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map(item => <Card key={item.productId} className="overflow-hidden">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col space-y-4">
                      {/* Product Image & Info Row */}
                      <div className="flex items-start space-x-4 min-w-0">
                        <div className="flex-shrink-0">
                          <img src={item.productImage} alt={item.productName} className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-cover rounded-lg bg-muted" />
                        </div>

                        {/* Product Info */}
                        <div className="flex-grow space-y-2 min-w-0">
                          <Link to={`/produto/${item.productId}`} className="block hover:text-primary transition-colors">
                            <h3 className="font-semibold text-sm sm:text-base md:text-lg line-clamp-2">{item.productName}</h3>
                          </Link>
                          
                          {item.variants && Object.keys(item.variants).length > 0 && <div className="flex flex-wrap gap-1 sm:gap-2">
                              {Object.entries(item.variants).map(([key, value]) => <Badge key={key} variant="secondary" className="text-xs truncate max-w-full">
                                  {key}: {value}
                                </Badge>)}
                            </div>}

                          <p className="text-lg sm:text-xl md:text-2xl font-bold text-primary">
                            {formatPrice(item.price)}
                          </p>
                        </div>
                      </div>

                      {/* Controls & Total Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">

                      {/* Quantity Controls */}
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                        <div className="flex items-center justify-center sm:justify-start space-x-1 bg-muted rounded-lg p-1">
                          <Button variant="ghost" size="sm" onClick={() => handleQuantityChange(item.productId, item.quantity - 1)} disabled={item.quantity <= 1} className="h-10 w-10">
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-16 text-center font-medium text-lg">
                            {item.quantity}
                          </span>
                          <Button variant="ghost" size="sm" onClick={() => handleQuantityChange(item.productId, item.quantity + 1)} className="h-10 w-10">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>

                        <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.productId, item.productName)} className="text-destructive hover:text-destructive h-10 px-4 w-full sm:w-auto">
                          <Trash2 className="w-4 h-4 mr-2" />
                          <span className="sm:hidden">Remover</span>
                        </Button>
                      </div>

                        {/* Item Total */}
                        <div className="text-center sm:text-right">
                          <p className="text-lg sm:text-xl font-bold">
                            Total: {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>)}
            </div>

            {/* Cart Actions */}
            {items.length > 0 && <div className="lg:col-span-2 mt-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={handleSyncPrices} disabled={isUpdatingPrices} size="sm">
                          {isUpdatingPrices ? <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Atualizando...
                            </> : <>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Atualizar Preços
                            </>}
                        </Button>
                        <Button variant="outline" onClick={handleClearCart} size="sm">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Limpar Carrinho
                        </Button>
                      </div>
                      {lastSyncTime && <div className="text-sm text-muted-foreground">
                          Última atualização: {formatLastSync()}
                        </div>}
                    </div>
                  </CardContent>
                </Card>
              </div>}

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
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

                    {!freeShipping}

                    <Separator />
                    
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">{formatPrice(finalTotal)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button onClick={handleCheckout} className="w-full btn-checkout" size="lg">
                      Finalizar Compra
                    </Button>
                    
                    <Button variant="outline" className="w-full text-continue-shopping" asChild>
                      <Link to="/">
                        Continuar Comprando
                      </Link>
                    </Button>
                  </div>

                  <div className="text-center pt-4">
                    <div className="flex items-center justify-center space-x-2 text-sm">
                      <div className="w-4 h-4 bg-success rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                      <span className="text-security">Compra 100% segura</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>;
};
export default Carrinho;