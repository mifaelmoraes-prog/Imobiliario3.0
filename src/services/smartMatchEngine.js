/**
 * smartMatchEngine.js
 * Motor explicável de compatibilidade 5D entre o Perfil do Comprador e os Imóveis.
 * 
 * Atende aos requisitos de:
 * - Match Explicável (US-05)
 * - Modelo Unificado de 4 Pilares (US-14 / GAP-07.1)
 * - Fim da falsa qualificação (GAP-05.3): se nada estiver filtrado, não infla 100%.
 */

export function calculatePropertyMatch(property, profile) {
  if (!property) return { score: 0, whyMatches: [], whyNot: [], criteriaCount: 0 };

  // Se o perfil não tem nenhum filtro preenchido, retorna sem match forçado
  const hasActiveFilters = 
    (profile.location?.neighborhoods && profile.location.neighborhoods.length > 0) ||
    (profile.budget?.maxBudget && profile.budget.maxBudget < 10000000) ||
    (profile.typology?.minBedrooms > 0) ||
    (profile.typology?.minParking > 0) ||
    (profile.lifestyle?.amenities && profile.lifestyle.amenities.length > 0);

  if (!hasActiveFilters) {
    return {
      score: null, // Sem perfil ativo, não exibe badge de match (atende GAP-04.1 e GAP-05.3)
      hasActiveProfile: false,
      whyMatches: [],
      whyNot: [],
      criteriaMet: 0,
      totalCriteria: 0
    };
  }

  let totalWeight = 0;
  let earnedScore = 0;
  const whyMatches = [];
  const whyNot = [];
  let criteriaMet = 0;
  let totalCriteria = 0;

  // 1. Pilar Orçamento (Peso 35)
  if (profile.budget?.maxBudget && profile.budget.maxBudget < 10000000) {
    totalWeight += 35;
    totalCriteria += 1;
    const price = property.price || 0;
    const maxBudget = profile.budget.maxBudget;

    if (price <= maxBudget) {
      earnedScore += 35;
      criteriaMet += 1;
      const savings = maxBudget - price;
      if (savings > 0) {
        whyMatches.push(`R$ ${(savings / 1000).toFixed(0)}k abaixo do seu teto orçamentário`);
      } else {
        whyMatches.push('Exatamente dentro do seu teto orçamentário');
      }
    } else if (price <= maxBudget * 1.10) {
      // Até 10% de folga
      earnedScore += 20;
      whyNot.push(`Preço ligeiramente acima (+${Math.round(((price - maxBudget) / maxBudget) * 100)}% do teto)`);
    } else {
      whyNot.push(`Acima do teto estipulado de R$ ${(maxBudget / 1000000).toFixed(1)}M`);
    }
  }

  // 2. Pilar Localização (Peso 30)
  if (profile.location?.neighborhoods && profile.location.neighborhoods.length > 0) {
    totalWeight += 30;
    totalCriteria += 1;
    const propNeighborhood = (property.neighborhood || '').toLowerCase();
    const matched = profile.location.neighborhoods.some(n => 
      propNeighborhood.includes(n.toLowerCase()) || n.toLowerCase().includes(propNeighborhood)
    );

    if (matched) {
      earnedScore += 30;
      criteriaMet += 1;
      whyMatches.push(`Localizado no bairro desejado: ${property.neighborhood}`);
    } else {
      whyNot.push(`Localizado em ${property.neighborhood || 'outro bairro'}`);
    }
  }

  // 3. Pilar Tipologia (Peso 20: Quartos + Vagas + Tipo)
  if (profile.typology) {
    let typoScore = 0;
    let typoPossible = 0;

    if (profile.typology.minBedrooms > 0) {
      typoPossible += 10;
      totalCriteria += 1;
      if ((property.bedrooms || 0) >= profile.typology.minBedrooms) {
        typoScore += 10;
        criteriaMet += 1;
        const b = property.bedrooms || 0;
        whyMatches.push(`${b} ${b === 1 ? 'quarto' : 'quartos'} atendendo sua necessidade`);
      } else {
        whyNot.push(`Possui ${property.bedrooms || 0} quartos (você solicitou ${profile.typology.minBedrooms}+)`);
      }
    }

    if (profile.typology.minParking > 0) {
      typoPossible += 5;
      totalCriteria += 1;
      if ((property.parking || 0) >= profile.typology.minParking) {
        typoScore += 5;
        criteriaMet += 1;
        const p = property.parking || 0;
        whyMatches.push(`${p} ${p === 1 ? 'vaga' : 'vagas'}`);
      } else {
        whyNot.push(`Apenas ${property.parking || 0} vaga(s) disponível(is)`);
      }
    }

    if (profile.typology.propertyType && profile.typology.propertyType !== 'Todos') {
      typoPossible += 5;
      totalCriteria += 1;
      if ((property.type || '').toLowerCase() === profile.typology.propertyType.toLowerCase()) {
        typoScore += 5;
        criteriaMet += 1;
        whyMatches.push(`Tipologia exata: ${property.type}`);
      } else {
        whyNot.push(`Tipologia diferente: ${property.type}`);
      }
    }

    if (typoPossible > 0) {
      totalWeight += typoPossible;
      earnedScore += typoScore;
    }
  }

  // 4. Pilar Estilo de Vida & Comodidades (Peso 15)
  if (profile.lifestyle?.amenities && profile.lifestyle.amenities.length > 0) {
    totalWeight += 15;
    totalCriteria += 1;
    const propAmenities = (property.amenities || []).map(a => a.toLowerCase());
    const matchedAmenities = profile.lifestyle.amenities.filter(desire =>
      propAmenities.some(a => a.includes(desire.toLowerCase()) || desire.toLowerCase().includes(a))
    );

    if (matchedAmenities.length > 0) {
      const ratio = matchedAmenities.length / profile.lifestyle.amenities.length;
      earnedScore += Math.round(15 * ratio);
      criteriaMet += 1;
      whyMatches.push(`Atende aos desejos: ${matchedAmenities.slice(0, 3).join(', ')}`);
    } else {
      whyNot.push('Não possui todas as comodidades de estilo de vida prioritárias');
    }
  }

  const finalScore = totalWeight > 0 ? Math.round((earnedScore / totalWeight) * 100) : 0;

  return {
    score: Math.min(100, Math.max(0, finalScore)),
    hasActiveProfile: true,
    whyMatches,
    whyNot,
    criteriaMet,
    totalCriteria,
    summary: `${criteriaMet} de ${totalCriteria} pilares atendidos`
  };
}

