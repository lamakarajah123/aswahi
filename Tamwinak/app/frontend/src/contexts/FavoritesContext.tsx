import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Product } from '@/types';

interface FavoritesContextType {
  favorites: Product[];
  toggleFavorite: (product: Product) => void;
  removeFavorite: (productId: number) => void;
  isFavorite: (productId: number) => boolean;
  favoritesCount: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const storageKey = user?.id ? `favorites_cart_${user.id}` : 'favorites_cart_guest';

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setFavorites(saved ? JSON.parse(saved) : []);
    } catch {
      setFavorites([]);
    }
  }, [storageKey]);

  const toggleFavorite = useCallback((product: Product) => {
    setFavorites((prev) => {
      const isFav = prev.some((p) => p.id === product.id);
      let updated: Product[];
      
      if (isFav) {
        updated = prev.filter((p) => p.id !== product.id);
        toast.info(t('favorites.removed_msg', `${product.name} removed from favorites`));
      } else {
        updated = [...prev, product];
        toast.success(t('favorites.added_msg', `${product.name} added to favorites`));
      }
      
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }, [storageKey, t]);

  const removeFavorite = useCallback((productId: number) => {
    setFavorites((prev) => {
      const updated = prev.filter((p) => p.id !== productId);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }, [storageKey]);

  const isFavorite = useCallback((productId: number) => {
    return favorites.some((p) => p.id === productId);
  }, [favorites]);

  return (
    <FavoritesContext.Provider value={{
      favorites,
      toggleFavorite,
      removeFavorite,
      isFavorite,
      favoritesCount: favorites.length
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
