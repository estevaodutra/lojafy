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
  syncPrices: () => Promise<{ updated: boolean; updatedItems: string[]; removedItems: string[] }>;
  isUpdatingPrices: boolean;
  lastSyncTime: Date | null;
  storeSlug: string | null;
  setStoreSlug: (slug: string | null) => void;
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
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [storeSlug, setStoreSlugState] = useState<string | null>(null);

  const syncPricesInternal = async (cartItems: OrderItem[] = items) => {
    if (cartItems.length === 0) return { updated: false, updatedItems: [], removedItems: [] };

    try {
      const productIds = cartItems.map(item => item.productId);
      console.log('🔍 Checking prices for products:', productIds);
      
      const { data: products, error } = await supabase
        .from('products')
        .select('id, price, name, active')
        .in('id', productIds);

      if (error) throw error;

      const updatedItems: string[] = [];
      const removedItems: string[] = [];
      const activeProducts = products?.filter(p => p.active) || [];
      
      const newItems = cartItems.map(item => {
        const product = activeProducts.find(p => p.id === item.productId);
        
        if (!product) {
          // Product no longer exists or is inactive
          removedItems.push(item.productName);
          console.log('❌ Product removed or inactive:', item.productName);
          return null;
        }
        
        const currentPrice = Number(product.price);
        const cartPrice = Number(item.price);
        
        if (currentPrice !== cartPrice) {
          console.log('💰 Price change detected:', {
            product: product.name,
            oldPrice: cartPrice,
            newPrice: currentPrice,
            difference: currentPrice - cartPrice
          });
          updatedItems.push(product.name);
          return { ...item, price: currentPrice };
        }
        
        return item;
      }).filter(Boolean) as OrderItem[];

      const hasChanges = updatedItems.length > 0 || removedItems.length > 0;
      
      if (hasChanges) {
        setItems(newItems);
        setLastSyncTime(new Date());
        console.log('✅ Cart updated:', {
          updatedPrices: updatedItems.length,
          removedProducts: removedItems.length,
          totalItems: newItems.length
        });
      }

      return { 
        updated: hasChanges, 
        updatedItems, 
        removedItems 
      };
    } catch (error) {
      console.error('❌ Error syncing cart prices:', error);
      return { updated: false, updatedItems: [], removedItems: [] };
    }
  };

  // Load cart from localStorage on mount and auto-sync prices
  useEffect(() => {
    const loadCartAndSync = async () => {
      const savedCart = localStorage.getItem('cart');
      const savedStoreSlug = localStorage.getItem('cartStoreSlug');
      
      if (savedStoreSlug) {
        setStoreSlugState(savedStoreSlug);
      }
      
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          console.log('📦 Loaded cart from localStorage:', parsedCart.length, 'items');
          
          // Validate and sanitize prices
          const sanitizedCart = parsedCart.map((item: OrderItem) => ({
            ...item,
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1,
          }));
          
          setItems(sanitizedCart);
          
          // Auto-sync prices if we have items
          if (sanitizedCart.length > 0) {
            console.log('🔄 Auto-syncing prices on cart load...');
            await syncPricesInternal(sanitizedCart);
          }
        } catch (error) {
          console.error('❌ Error loading cart from localStorage:', error);
        }
      }
    };
    
    loadCartAndSync();
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  // Save storeSlug to localStorage whenever it changes
  useEffect(() => {
    if (storeSlug) {
      localStorage.setItem('cartStoreSlug', storeSlug);
    } else {
      localStorage.removeItem('cartStoreSlug');
    }
  }, [storeSlug]);

  const setStoreSlug = (slug: string | null) => {
    setStoreSlugState(slug);
  };

  const addItem = (item: OrderItem) => {
    console.log('➕ Adding item to cart:', {
      name: item.productName,
      price: item.price,
      quantity: item.quantity,
      variants: item.variants
    });
    
    // Ensure price is a valid number
    const sanitizedItem = {
      ...item,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
    };
    
    setItems(currentItems => {
      const existingItem = currentItems.find(i => i.productId === sanitizedItem.productId);
      
      if (existingItem) {
        console.log('🔄 Updating existing item quantity:', existingItem.quantity, '+', sanitizedItem.quantity);
        return currentItems.map(i =>
          i.productId === sanitizedItem.productId
            ? { ...i, quantity: i.quantity + sanitizedItem.quantity }
            : i
        );
      }
      
      console.log('🆕 Adding new item to cart');
      return [...currentItems, sanitizedItem];
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
    setStoreSlug(null);
  };

  const isInCart = (productId: string) => {
    return items.some(item => item.productId === productId);
  };

  const getItemQuantity = (productId: string) => {
    const item = items.find(i => i.productId === productId);
    return item?.quantity || 0;
  };

  const syncPrices = async () => {
    setIsUpdatingPrices(true);
    try {
      return await syncPricesInternal();
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
    lastSyncTime,
    storeSlug,
    setStoreSlug,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};