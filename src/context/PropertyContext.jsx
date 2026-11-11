import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { SCRAPED_PROPERTIES } from '../data/scrapedProperties';
import { calculatePropertyMatch } from '../services/smartMatchEngine';
import { useBuyerProfile } from './BuyerProfileContext';

const PropertyContext = createContext(null);
const FAVORITES_STORAGE_KEY = 'urban_real_state_favorites_v3';

export function PropertyProvider({ children }) {
  const { profile, logActivity } = useBuyerProfile();

  const [properties] = useState(() => SCRAPED_PROPERTIES || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [sortOrder, setSortOrder] = useState('match_desc'); // 'match_desc' | 'price_asc' | 'price_desc' | 'area_desc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
  const [activePropertyDetail, setActivePropertyDetail] = useState(null);
  const [criticismProperty, setCriticismProperty] = useState(null);
  const [showExitIntent, setShowExitIntent] = useState(false);

  // Favoritos
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.error('Erro ao salvar favoritos:', e);
    }
  }, [favorites]);

  const toggleFavorite = (propertyId) => {
    const isFav = favorites.includes(propertyId);
    const updated = isFav ? favorites.filter(id => id !== propertyId) : [...favorites, propertyId];
    setFavorites(updated);

    const prop = properties.find(p => p.id === propertyId);
    logActivity('FAVORITE', `${isFav ? 'Removido dos' : 'Adicionado aos'} favoritos: ${prop?.title || propertyId}`, { propertyId });
  };

  // Calcula matches e filtra com reatividade limpa
  const processedProperties = useMemo(() => {
    let list = properties.map(prop => {
      const matchData = calculatePropertyMatch(prop, profile);
      return {
        ...prop,
        matchScore: matchData.score,
        matchDetails: matchData
      };
    });

    // Filtro por busca textual (Hero)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.neighborhood && p.neighborhood.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.amenities && p.amenities.some(a => a.toLowerCase().includes(q)))
      );
    }

    // Filtro de cidade (se selecionada)
    if (selectedCity) {
      list = list.filter(p => p.city && p.city.toLowerCase().includes(selectedCity.toLowerCase()));
    }

    // Ordenação
    list.sort((a, b) => {
      if (sortOrder === 'match_desc') {
        const scoreA = a.matchScore ?? -1;
        const scoreB = b.matchScore ?? -1;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (b.price || 0) - (a.price || 0);
      }
      if (sortOrder === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortOrder === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortOrder === 'area_desc') return (b.area || 0) - (a.area || 0);
      return 0;
    });

    return list;
  }, [properties, profile, searchQuery, selectedCity, sortOrder]);

  // Lista de cidades disponíveis
  const availableCities = useMemo(() => {
    const set = new Set();
    properties.forEach(p => {
      if (p.city) set.add(p.city.split('-')[0].trim());
    });
    return Array.from(set).slice(0, 8);
  }, [properties]);

  return (
    <PropertyContext.Provider
      value={{
        properties: processedProperties,
        // Catálogo completo, sem filtros de busca/cidade (usado pelo Concierge)
        allProperties: properties,
        rawPropertiesCount: properties.length,
        searchQuery,
        setSearchQuery,
        selectedCity,
        setSelectedCity,
        sortOrder,
        setSortOrder,
        viewMode,
        setViewMode,
        favorites,
        toggleFavorite,
        activePropertyDetail,
        setActivePropertyDetail,
        criticismProperty,
        setCriticismProperty,
        showExitIntent,
        setShowExitIntent,
        availableCities
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperties() {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error('useProperties deve ser utilizado dentro de um PropertyProvider');
  }
  return context;
}

