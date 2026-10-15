import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OrderItem } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export interface CartSyncResult {
  updated: boolean;
  updatedItems: string[];
  removedItems: string[];
  adjustedItems: string[];
  syncedCart: OrderItem[];
}

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
  syncPrices: (itemsToSync?: OrderItem[]) => Promise<CartSyncResult>;
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

  const syncPricesInternal = async (cartItems?: OrderItem[]): Promise<CartSyncResult> => {
    const currentItems = cartItems ?? items;
    if (!currentItems || currentItems.length === 0) {
      return { updated: false, updatedItems: [], removedItems: [], adjustedItems: [], syncedCart: [] };
    }

    try {
      const productIds = currentItems.map(item => item.productId).filter(Boolean);
      if (productIds.length === 0) {
        return { updated: false, updatedItems: [], removedItems: [], adjustedItems: [], syncedCart: [] };
      }

      console.log('🔍 Syncing cart with database products:', productIds);

      // 1. Fetch live products from store_products
      const { data: products, error } = await supabase
        .from('store_products')
        .select('id, price, name, active, stock_quantity, image_url, main_image_url, high_rotation')
        .in('id', productIds);

      if (error) {
        console.error('❌ Error fetching store_products in sync:', error);
        throw error;
      }

      // 2. If storeSlug is set, check reseller custom prices
      const resellerProductMap = new Map<string, { custom_price?: number; active?: boolean }>();
      const currentStoreSlug = storeSlug || localStorage.getItem('cartStoreSlug');
      if (currentStoreSlug) {
        try {
          const { data: storeInfo } = await supabase
            .from('reseller_stores')
            .select('reseller_id')
            .eq('store_slug', currentStoreSlug)
            .maybeSingle();

          if (storeInfo?.reseller_id) {
            const { data: resellerProds } = await supabase
              .from('reseller_products')
              .select('product_id, custom_price, active')
              .eq('reseller_id', storeInfo.reseller_id)
              .in('product_id', productIds);

            if (resellerProds) {
              for (const rp of resellerProds) {
                resellerProductMap.set(rp.product_id, {
                  custom_price: rp.custom_price,
                  active: rp.active
                });
              }
            }
          }
        } catch (resellerErr) {
          console.warn('Could not fetch reseller products for cart sync:', resellerErr);
        }
      }

      const updatedItems: string[] = [];
      const removedItems: string[] = [];
      const adjustedItems: string[] = [];
      let hasChanges = false;

      const newItems: OrderItem[] = [];

      for (const item of currentItems) {
        const product = products?.find(p => p.id === item.productId);
        const resellerConfig = resellerProductMap.get(item.productId);
        const isResellerDisabled = resellerConfig && resellerConfig.active === false;

        // Inactive, deleted or disabled in reseller store
        if (!product || !product.active || isResellerDisabled) {
          removedItems.push(item.productName);
          hasChanges = true;
          console.log('❌ Product removed or inactive:', item.productName);
          continue;
        }

        // Out of stock
        const stockQty = typeof product.stock_quantity === 'number' ? product.stock_quantity : 9999;
        if (stockQty <= 0) {
          removedItems.push(`${item.productName} (sem estoque)`);
          hasChanges = true;
          console.log('❌ Product removed (out of stock):', item.productName);
          continue;
        }

        // Check if quantity exceeds available stock
        let quantity = item.quantity;
        if (quantity > stockQty) {
          quantity = stockQty;
          adjustedItems.push(`${product.name}: quantidade ajustada de ${item.quantity} para ${stockQty} (limite do estoque)`);
          hasChanges = true;
        }

        // Name sync: update to current product name (preserving variant tag if present)
        const variantSuffix = item.variants?.variant || item.variants?.name;
        const targetName = variantSuffix ? `${product.name} - ${variantSuffix}` : product.name;
        if (item.productName !== targetName) {
          updatedItems.push(`Nome atualizado: "${item.productName}" → "${targetName}"`);
          hasChanges = true;
        }

        // Price sync: check custom reseller price or standard product price
        let targetPrice = Number(product.price);
        if (resellerConfig?.custom_price && Number(resellerConfig.custom_price) > 0) {
          targetPrice = Number(resellerConfig.custom_price);
        }

        const cartPrice = Number(item.price);
        if (Math.abs(targetPrice - cartPrice) > 0.001) {
          console.log('💰 Price change detected:', {
            product: targetName,
            oldPrice: cartPrice,
            newPrice: targetPrice,
            difference: targetPrice - cartPrice
          });
          updatedItems.push(`Preço de "${targetName}": R$ ${cartPrice.toFixed(2)} → R$ ${targetPrice.toFixed(2)}`);
          hasChanges = true;
        }

        // Image sync
        const targetImage = product.main_image_url || product.image_url || item.productImage;
        if (targetImage && item.productImage !== targetImage) {
          hasChanges = true;
        }

        // High rotation sync
        const targetHighRotation = !!product.high_rotation;
        if (item.highRotation !== targetHighRotation) {
          hasChanges = true;
        }

        newItems.push({
          ...item,
          productName: targetName,
          price: targetPrice,
          quantity,
          productImage: targetImage || item.productImage,
          highRotation: targetHighRotation
        });
      }

      if (hasChanges) {
        setItems(newItems);
        localStorage.setItem('cart', JSON.stringify(newItems));
        setLastSyncTime(new Date());
        console.log('✅ Cart updated with live state:', {
          updated: updatedItems.length,
          removed: removedItems.length,
          adjusted: adjustedItems.length,
          totalItems: newItems.length
        });
      }

      return { 
        updated: hasChanges, 
        updatedItems, 
        removedItems,
        adjustedItems,
        syncedCart: newItems
      };
    } catch (error) {
      console.error('❌ Error syncing cart:', error);
      return { updated: false, updatedItems: [], removedItems: [], adjustedItems: [], syncedCart: currentItems };
    }
  };

  // Load cart from localStorage on mount and auto-sync prices (debounced)
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
          
          // Auto-sync cart with live database on load
          if (sanitizedCart.length > 0) {
            console.log('🔄 Auto-syncing cart on load...');
            syncPricesInternal(sanitizedCart).catch(err => {
              console.warn('Initial cart sync non-fatal error:', err);
            });
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
        console.log('🔄 Updating existing item quantity and info:', existingItem.quantity, '+', sanitizedItem.quantity);
        return currentItems.map(i =>
          i.productId === sanitizedItem.productId
            ? { 
                ...i, 
                productName: sanitizedItem.productName,
                price: sanitizedItem.price,
                productImage: sanitizedItem.productImage || i.productImage,
                highRotation: sanitizedItem.highRotation !== undefined ? sanitizedItem.highRotation : i.highRotation,
                quantity: i.quantity + sanitizedItem.quantity 
              }
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

  const syncPrices = async (itemsToSync?: OrderItem[]) => {
    setIsUpdatingPrices(true);
    try {
      return await syncPricesInternal(itemsToSync);
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