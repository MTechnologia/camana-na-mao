import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";

export interface Favorite {
  id: string;
  type: 'audiencia' | 'vereador' | 'noticia' | 'agenda' | 'curso';
  title: string;
  subtitle?: string;
  path: string;
  image?: string;
  metadata?: Record<string, any>;
}

interface FavoritesContextType {
  favorites: Favorite[];
  addFavorite: (item: Favorite) => void;
  removeFavorite: (id: string) => void;
  isFavorited: (id: string) => boolean;
  toggleFavorite: (item: Favorite) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<Favorite[]>(() => {
    const stored = localStorage.getItem('cmsp_favorites');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem('cmsp_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = useCallback((item: Favorite) => {
    setFavorites(prev => {
      if (prev.some(f => f.id === item.id)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id));
  }, []);

  const isFavorited = useCallback((id: string) => {
    return favorites.some(f => f.id === id);
  }, [favorites]);

  const toggleFavorite = useCallback((item: Favorite) => {
    setFavorites(prev => {
      if (prev.some(f => f.id === item.id)) {
        return prev.filter(f => f.id !== item.id);
      }
      return [...prev, item];
    });
  }, []);

  const value = useMemo(() => ({ 
    favorites, 
    addFavorite, 
    removeFavorite, 
    isFavorited, 
    toggleFavorite 
  }), [favorites, addFavorite, removeFavorite, isFavorited, toggleFavorite]);

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return context;
};
