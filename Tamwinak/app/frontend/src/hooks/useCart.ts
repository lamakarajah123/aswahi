import { useState, useMemo, useCallback, useEffect } from 'react';
import { apiCall } from '@/lib/axios';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CartItem, Product } from '@/types';

interface CartUnit {
  name: string;
  nameAr: string | null;
  price: number;
  unitId: number | string;
  step: number;
}

interface UseCartOptions {
  /** localStorage key for persistence */
  storageKey: string;
  /** Optional store ID to fetch store-specific discounts */
  storeId?: string | number;
  /** Current user ID if logged in */
  userId?: string | null;
}

export function useCart({ storageKey, storeId, userId }: UseCartOptions) {
  const { currentLanguage, t } = useLanguage();

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Handle migration from guest cart to user cart on login
  useEffect(() => {
    if (!userId) {
      // If we just logged out or are still a guest, just load the current storageKey
      try {
        const saved = localStorage.getItem(storageKey);
        setCart(saved ? JSON.parse(saved) : []);
      } catch {
        setCart([]);
      }
      return;
    }

    // Logic for LOGGED-IN users
    try {
      // 1. Load User Cart
      const savedUser = localStorage.getItem(storageKey);
      let userCart: CartItem[] = savedUser ? JSON.parse(savedUser) : [];

      // 2. Look for Guest Cart (try to guess the key based on our key)
      // If storageKey is index_cart_ID -> guestKey is index_cart_guest
      // If storageKey is store_cart_ID_UID -> guestKey is store_cart_ID_guest
      const guestKey = storageKey.replace(`_${userId}`, '_guest');
      
      if (guestKey !== storageKey) {
        const savedGuest = localStorage.getItem(guestKey);
        const guestCart: CartItem[] = savedGuest ? JSON.parse(savedGuest) : [];

        if (guestCart.length > 0) {
          // 3. Merge Guest into User
          const merged = [...userCart];
          guestCart.forEach(gItem => {
            const existingIdx = merged.findIndex(uItem => uItem.id === gItem.id);
            if (existingIdx > -1) {
              // Same product-unit combo: take the higher quantity or sum them?
              // Usually sum them is safer for grocery
              merged[existingIdx] = {
                ...merged[existingIdx],
                quantity: merged[existingIdx].quantity + gItem.quantity
              };
            } else {
              merged.push(gItem);
            }
          });

          userCart = merged;
          // 4. Update User Cart in storage
          localStorage.setItem(storageKey, JSON.stringify(userCart));
          // 5. Clear Guest Cart
          localStorage.removeItem(guestKey);
        }
      }

      setCart(userCart);
    } catch (err) {
      console.error('Cart migration error:', err);
      // Fallback: just load user cart
      const saved = localStorage.getItem(storageKey);
      setCart(saved ? JSON.parse(saved) : []);
    }
  }, [storageKey, userId]);

  // Dialog / unit-selection state
  const [addingProduct, setAddingProduct] = useState<Product | null>(null);
  const [availableUnits, setAvailableUnits] = useState<CartUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<CartUnit | null>(null);
  const [addQuantities, setAddQuantities] = useState<Record<string | number, number>>({});
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Derived values
  const cartTotal = useMemo(() => cart.reduce((sum, c) => sum + c.price * c.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, c) => sum + (Number(c.quantity) || 0), 0), [cart]);
  const cartMap = useMemo(() => {
    const m: Record<number, number> = {};
    for (const c of cart) m[c.product.id] = (m[c.product.id] ?? 0) + (Number(c.quantity) || 0);
    return m;
  }, [cart]);

  const persistCart = useCallback((updated: CartItem[]) => {
    localStorage.setItem(storageKey, JSON.stringify(updated));
  }, [storageKey]);

  const openAddToCart = useCallback(async (product: Product, overrides?: { storeId?: number | string }) => {
    // Immediate check if product object already knows it's closed
    if (product.is_open === false) {
      toast.error(t('cart.store_closed_error', `This store is currently closed and not accepting orders.`));
      return;
    }
    setAddingProduct(product);
    setLoadingUnits(true);
    setAddQuantities({});
    setAddDialogOpen(true);
    const effectiveStoreId = overrides?.storeId ?? storeId ?? product.store_id;

    try {
      const res = await apiCall.invoke({
        url: `/api/v1/grocery/products/${product.id}/units`,
        method: 'GET',
        params: (effectiveStoreId !== undefined && effectiveStoreId !== null) ? { store_id: effectiveStoreId } : {},
      });

      const units: CartUnit[] = (res.data || []).map((u: Record<string, unknown>) => {
        const label = String(u.unit_name || 'unit');
        const labelAr = u.unit_name_ar ? String(u.unit_name_ar) : null;
        return { name: label, nameAr: labelAr, price: Number(u.price), unitId: u.unit_id as number, step: Number(u.unit_step || 1.0) };
      });

      setAvailableUnits(units);
      setSelectedUnit(units[0] ?? null);
      
      // Initialize quantities: first unit to 1, others to 0 (or all to 0? user image shows 1,1)
      const initialQtys: Record<string | number, number> = {};
      units.forEach((u, idx) => {
        initialQtys[u.unitId] = idx === 0 ? 1 : 0; 
      });
      setAddQuantities(initialQtys);

    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to load product units';
      toast.error(msg);
      setAvailableUnits([]);
      setSelectedUnit(null);
      setAddQuantities({});
      setAddDialogOpen(false);
    } finally {
      setLoadingUnits(false);
    }
  }, [storeId]);

  const confirmAddToCart = useCallback((customizations?: any[]) => {
    if (!addingProduct || availableUnits.length === 0) return;

    setCart((prev) => {
      let updated = [...prev];
      
      // Filter units that have quantity > 0
      const toAdd = availableUnits.filter(u => (addQuantities[u.unitId] || 0) > 0);
      
      if (toAdd.length === 0) {
        toast.error(t('cart.select_quantity_error', 'Please select a quantity for at least one unit'));
        return prev;
      }

      toAdd.forEach(unit => {
        const qty = addQuantities[unit.unitId];
        // Calculate extra price from customizations
        const extraPrice = customizations ? customizations.reduce((sum, stage) => {
            return sum + stage.options.reduce((oSum: number, o: any) => oSum + (Number(o.price) || 0), 0);
        }, 0) : 0;

        const finalPrice = unit.price + extraPrice;
        
        // Generate a unique ID for this specific customization set
        const customHash = customizations ? JSON.stringify(customizations) : '';
        // Use a safe Base64 encoding for Unicode strings to avoid btoa crash
        const encodedHash = customHash ? btoa(encodeURIComponent(customHash)).substring(0, 10) : 'none';
        const cartId = `${addingProduct.id}-${unit.unitId}-${encodedHash}`;
        
        const existingIdx = updated.findIndex((c) => c.id === cartId);
        
        if (existingIdx > -1 && !customizations) {
          // If no customizations, we can merge
          updated[existingIdx] = { 
            ...updated[existingIdx], 
            quantity: updated[existingIdx].quantity + qty,
            price: finalPrice
          };
        } else {
          // Customized items or new items are always separate or added fresh
          // Actually, if customHash is same, we could still merge, but safer to just add if it's a new interaction
          const exactMatch = updated.findIndex(c => c.id === cartId);
          if (exactMatch > -1) {
             updated[exactMatch] = { ...updated[exactMatch], quantity: updated[exactMatch].quantity + qty };
          } else {
            updated.push({
              id: cartId,
              product: addingProduct,
              quantity: qty,
              unit: unit.name,
              unitAr: unit.nameAr,
              unitId: Number(unit.unitId),
              step: unit.step,
              price: finalPrice,
              customizations: customizations || null,
            });
          }
        }
      });
      
      persistCart(updated);
      return updated;
    });

    setAddDialogOpen(false);
    toast.success(`${addingProduct.name} ${t('cart.added_success_msg', 'added to cart')}`);
  }, [addingProduct, availableUnits, addQuantities, persistCart, t]);

  const updateQuantity = useCallback((cartId: string, deltaDirection: number) => {
    setCart((prev) => {
      const updated = prev
        .map((c) => {
          if (c.id === cartId) {
            const step = c.step || 1.0;
            const newQty = Math.max(0, parseFloat((c.quantity + (deltaDirection * step)).toFixed(2)));
            return { ...c, quantity: newQty };
          }
          return c;
        })
        .filter((c) => c.quantity > 0);
      persistCart(updated);
      return updated;
    });
  }, [persistCart]);

  const quickUpdate = useCallback((productId: number | string, delta: number) => {
    setCart((prev) => {
      const idx = prev.findIndex(c => c.product.id === productId);
      if (idx === -1 && delta > 0) return prev; // Cannot quick-add if not in cart (needs unit selection)
      
      const updated = prev.map((c, i) => {
        if (i === idx) {
          const step = c.step || 1.0;
          const newQty = Math.max(0, parseFloat((c.quantity + (delta * step)).toFixed(2)));
          return { ...c, quantity: newQty };
        }
        return c;
      }).filter(c => c.quantity > 0);
      
      persistCart(updated);
      return updated;
    });
  }, [persistCart]);

  const removeItem = useCallback((cartId: string) => {
    setCart((prev) => {
      const updated = prev.filter((c) => c.id !== cartId);
      persistCart(updated);
      return updated;
    });
  }, [persistCart]);

  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    cart,
    setCart,
    cartTotal,
    cartCount,
    cartMap,
    addingProduct,
    availableUnits,
    selectedUnit,
    setSelectedUnit,
    addQuantities,
    setAddQuantities,
    addDialogOpen,
    setAddDialogOpen,
    loadingUnits,
    openAddToCart,
    confirmAddToCart,
    updateQuantity,
    quickUpdate,
    removeItem,
    clearCart,
  };
}
