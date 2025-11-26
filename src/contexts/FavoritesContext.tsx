import React, { createContext, useContext, useState, useEffect } from "react";

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

  const addFavorite = (item: Favorite) => {
    setFavorites(prev => {
      if (prev.some(f => f.id === item.id)) return prev;
      return [...prev, item];
    });
  };

  const removeFavorite = (id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  const isFavorited = (id: string) => {
    return favorites.some(f => f.id === id);
  };

  const toggleFavorite = (item: Favorite) => {
    if (isFavorited(item.id)) {
      removeFavorite(item.id);
    } else {
      addFavorite(item);
    }
  };

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorited, toggleFavorite }}>
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
