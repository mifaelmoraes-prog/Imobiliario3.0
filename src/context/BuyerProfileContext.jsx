import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'urban_real_state_buyer_profile_v3';
const TIMELINE_KEY = 'urban_real_state_timeline_v3';

const DEFAULT_PROFILE = {
  // 1. Pilar Localização
  location: {
    city: 'Curitiba - PR',
    neighborhoods: [],
    provenance: { dataState: 'DECLARED', verificationState: 'NOT_VERIFIED' }
  },
  // 2. Pilar Tipologia
  typology: {
    propertyType: 'Todos', // 'Apartamento', 'Casa', 'Cobertura'
    minBedrooms: 0,
    minSuites: 0,
    minParking: 0,
    minArea: 0,
    provenance: { dataState: 'DECLARED', verificationState: 'NOT_VERIFIED' }
  },
  // 3. Pilar Orçamento
  budget: {
    maxBudget: 10000000, // 10M = sem limite
    targetBudget: 2500000,
    acceptsFinancing: true,
    provenance: { dataState: 'DECLARED', verificationState: 'NOT_VERIFIED' }
  },
  // 4. Pilar Estilo de Vida
  lifestyle: {
    amenities: [],
    importanceScale: {},
    provenance: { dataState: 'DECLARED', verificationState: 'NOT_VERIFIED' }
  },
  // Metadados do Lead
  metadata: {
    leadName: '',
    leadPhone: '',
    leadEmail: '',
    isIdentified: false,
    createdAt: new Date().toISOString()
  }
};

const BuyerProfileContext = createContext(null);

export function BuyerProfileProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Erro ao carregar perfil salvo:', e);
    }
    return DEFAULT_PROFILE;
  });

  const [timeline, setTimeline] = useState(() => {
    try {
      const saved = localStorage.getItem(TIMELINE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Erro ao carregar timeline:', e);
    }
    return [];
  });

  // Salva no localStorage a cada alteração
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error('Erro ao persistir perfil:', e);
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(TIMELINE_KEY, JSON.stringify(timeline));
    } catch (e) {
      console.error('Erro ao persistir timeline:', e);
    }
  }, [timeline]);

  // Registra eventos na timeline de atividades do lead (atende GAP-07.3 / US-12)
  const logActivity = (type, description, metadata = {}) => {
    const newEntry = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      timeFormatted: new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
      type, // 'VIEW_PROPERTY' | 'FAVORITE' | 'PROFILE_UPDATE' | 'SIMULATION' | 'PREREQ_ANALYSIS' | 'FEEDBACK'
      description,
      metadata
    };
    setTimeline(prev => [newEntry, ...prev.slice(0, 49)]); // Mantém os últimos 50 eventos
  };

  // Atualização atômica de pilares
  const updatePillar = (pillarName, values, dataState = 'DECLARED') => {
    setProfile(prev => ({
      ...prev,
      [pillarName]: {
        ...prev[pillarName],
        ...values,
        provenance: {
          dataState,
          verificationState: prev[pillarName]?.provenance?.verificationState || 'NOT_VERIFIED',
          updatedAt: new Date().toISOString()
        }
      }
    }));
  };

  // Atualização rápida de orçamento
  const setMaxBudget = (maxBudget) => {
    updatePillar('budget', { maxBudget });
    logActivity('PROFILE_UPDATE', `Teto orçamentário ajustado para R$ ${(maxBudget / 1000000).toFixed(1)}M`, { maxBudget });
  };

  // Toggle de comodidades / estilo de vida
  const toggleAmenity = (amenity) => {
    const current = profile.lifestyle.amenities || [];
    const exists = current.includes(amenity);
    const updated = exists ? current.filter(a => a !== amenity) : [...current, amenity];
    updatePillar('lifestyle', { amenities: updated });
    logActivity('PROFILE_UPDATE', `${exists ? 'Removido' : 'Adicionado'} interesse: ${amenity}`);
  };

  // Redefinir perfil
  const resetProfile = () => {
    setProfile(DEFAULT_PROFILE);
    logActivity('PROFILE_UPDATE', 'Perfil de busca redefinido');
  };

  // Identificar Lead (promove anônimo para contato)
  const identifyLead = (contactData) => {
    setProfile(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        ...contactData,
        isIdentified: true,
        identifiedAt: new Date().toISOString()
      }
    }));
    logActivity('LEAD_CONVERSION', `Comprador identificado: ${contactData.leadName || contactData.leadPhone}`);
  };

  // Contagem de pilares ativos (ex: "2 de 4 pilares preenchidos") - resolve GAP-05.3
  const activePillarsCount = [
    profile.location?.neighborhoods?.length > 0,
    profile.typology?.minBedrooms > 0 || profile.typology?.propertyType !== 'Todos',
    profile.budget?.maxBudget < 10000000,
    profile.lifestyle?.amenities?.length > 0
  ].filter(Boolean).length;

  return (
    <BuyerProfileContext.Provider
      value={{
        profile,
        updatePillar,
        setMaxBudget,
        toggleAmenity,
        resetProfile,
        identifyLead,
        activePillarsCount,
        timeline,
        logActivity
      }}
    >
      {children}
    </BuyerProfileContext.Provider>
  );
}

export function useBuyerProfile() {
  const context = useContext(BuyerProfileContext);
  if (!context) {
    throw new Error('useBuyerProfile deve ser utilizado dentro de um BuyerProfileProvider');
  }
  return context;
}
