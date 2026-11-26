import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { SCRAPED_PROPERTIES } from '../data/scrapedProperties';
import { calculatePropertyMatch } from '../services/smartMatchEngine';
import { buildVocabulary } from '../services/conciergeParser';
import { interpretarBusca, aplicarBusca } from '../services/buscaLivre';
import { nomeDaCidade } from '../services/cidade';
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
    } catch {
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
  // A busca do topo entende frases ("casa de aluguel em São Paulo") em vez de procurar o texto inteiro
  const vocabulary = useMemo(() => buildVocabulary(properties), [properties]);
  const buscaInterpretada = useMemo(() => interpretarBusca(searchQuery, vocabulary), [searchQuery, vocabulary]);

  const { processedProperties, searchNotice } = useMemo(() => {
    let aviso = null;
    let list = properties.map(prop => {
      const matchData = calculatePropertyMatch(prop, profile);
      return {
        ...prop,
        matchScore: matchData.score,
        matchDetails: matchData
      };
    });

    // Filtro por busca textual (Hero): critérios da frase; sem critério reconhecível, busca literal
    if (buscaInterpretada) {
      const r = aplicarBusca(list, buscaInterpretada);
      list = r.imoveis;
      aviso = r.aviso;
    } else if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.neighborhood && p.neighborhood.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.amenities && p.amenities.some(a => a.toLowerCase().includes(q)))
      );
    }

    // Filtro de cidade (se selecionada). Se a frase da busca já diz o lugar, ela vale mais que o
    // botão de cidade marcado antes ("casa em São Paulo" com Vitória marcada não pode dar zero)
    const buscaDizOLugar = Boolean(buscaInterpretada?.cidade || buscaInterpretada?.lugarDesconhecido);
    if (selectedCity && !buscaDizOLugar) {
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

    return { processedProperties: list, searchNotice: aviso };
  }, [properties, profile, searchQuery, buscaInterpretada, selectedCity, sortOrder]);

  // Lista de cidades disponíveis
  const availableCities = useMemo(() => {
    const set = new Set();
    properties.forEach(p => {
      if (p.city) set.add(nomeDaCidade(p.city));
    });
    return Array.from(set); // todas: com o Litoral Norte do RS passaram de 12
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
        // Aviso da busca por frase (aluguel, região sem imóveis), ou null
        searchNotice,
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

