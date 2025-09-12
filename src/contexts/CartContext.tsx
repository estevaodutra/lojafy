import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OrderItem } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface CartContextType {
  items: OrderItem[];
  itemsCount: number;
  totalPrice: number;
  addItem: (item: OrderItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
  getItemQuantity: (productId: string) => number;
  syncPrices: () => Promise<{ updated: boolean; updatedItems: string[] }>;
  isUpdatingPrices: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setItems(parsedCart);
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = (item: OrderItem) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(i => i.productId === item.productId);
      
      if (existingItem) {
        return currentItems.map(i =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      
      return [...currentItems, item];
    });
  };

  const removeItem = (productId: string) => {
    setItems(currentItems => currentItems.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    
    setItems(currentItems =>
      currentItems.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const isInCart = (productId: string) => {
    return items.some(item => item.productId === productId);
  };

  const getItemQuantity = (productId: string) => {
    const item = items.find(i => i.productId === productId);
    return item?.quantity || 0;
  };

  const syncPrices = async () => {
    if (items.length === 0) return { updated: false, updatedItems: [] };

    setIsUpdatingPrices(true);
    try {
      const productIds = items.map(item => item.productId);
      
      const { data: products, error } = await supabase
        .from('products')
        .select('id, price, name')
        .in('id', productIds)
        .eq('active', true);

      if (error) throw error;

      const updatedItems: string[] = [];
      const newItems = items.map(item => {
        const product = products?.find(p => p.id === item.productId);
        if (product && Number(product.price) !== item.price) {
          updatedItems.push(product.name);
          return { ...item, price: Number(product.price) };
        }
        return item;
      }).filter(item => {
        // Remove items where product no longer exists or is inactive
        return products?.some(p => p.id === item.productId);
      });

      if (updatedItems.length > 0 || newItems.length !== items.length) {
        setItems(newItems);
        return { updated: true, updatedItems };
      }

      return { updated: false, updatedItems: [] };
    } catch (error) {
      console.error('Error syncing cart prices:', error);
      return { updated: false, updatedItems: [] };
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  const itemsCount = items.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = items.reduce((total, item) => total + (item.price * item.quantity), 0);

  const value: CartContextType = {
    items,
    itemsCount,
    totalPrice,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    isInCart,
    getItemQuantity,
    syncPrices,
    isUpdatingPrices,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};