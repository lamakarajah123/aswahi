import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Product } from '@/types';

interface UseFavoritesOptions {
  storageKey: string;
}

export function useFavorites({ storageKey }: UseFavoritesOptions) {
  const { t } = useLanguage();

  const [favorites, setFavorites] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = useCallback((product: Product) => {
    setFavorites((prev) => {
      const isFav = prev.some((p) => p.id === product.id);
      let updated: Product[];
      
      if (isFav) {
        updated = prev.filter((p) => p.id !== product.id);
        toast.info(`${product.name} ${t('favorites.removed', 'removed from favorites')}`);
      } else {
        updated = [...prev, product];
        toast.success(`${product.name} ${t('favorites.added', 'added to favorites')}`);
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

  return {
    favorites,
    toggleFavorite,
    removeFavorite,
    isFavorite,
    favoritesCount: favorites.length
  };
}
