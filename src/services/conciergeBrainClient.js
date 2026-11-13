/**
 * conciergeBrainClient.js
 * Lado do navegador do cérebro do Concierge: chama /api/concierge e executa as
 * ferramentas sobre o catálogo local (mesmo motor de match do site), para que o
 * modelo só fale de imóveis reais.
 */
import { calculatePropertyMatch } from './smartMatchEngine';
import { normalizeText } from './conciergeParser';

const BRAIN_ENDPOINT = '/api/concierge';
const BRAIN_TIMEOUT_MS = 20000;
const NO_BUDGET = 10000000; // mesmo valor de "sem limite" do perfil
const MAX_LISTED = 5;
const MIN_PLAUSIBLE_BUDGET = 100000;

let brainAvailable = import.meta.env?.VITE_CONCIERGE_BRAIN !== 'off';
export const isBrainAvailable = () => brainAvailable;

// Modelo que respondeu por último (diagnóstico: window.__brainModel no console)
let lastModel = null;
export const getLastBrainModel = () => lastModel;
if (typeof window !== 'undefined') Object.defineProperty(window, '__brainModel', { get: () => lastModel, configurable: true });

/** Resumo do catálogo enviado ao modelo (cidades, bairros e comodidades reais). */
export function buildBrainContext(vocabulary) {
  const bairrosPorCidade = {};
  vocabulary.neighborhoods.forEach(n => {
    const city = vocabulary.cities.find(c => normalizeText(c.shortLabel) === n.cityKey);
    const name = city ? city.label : n.cityKey;
    (bairrosPorCidade[name] ||= []).push(n.label);
  });
  return {
    cidades: vocabulary.cities.map(c => c.label),
    bairrosPorCidade,
    comodidades: vocabulary.amenities.map(a => a.label)
  };
}

/** Uma rodada com o modelo. Lança erro se o cérebro estiver indisponível. */
export async function askBrain(messages, context, signal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BRAIN_TIMEOUT_MS);
  signal?.addEventListener('abort', () => controller.abort());
  try {
    const res = await fetch(BRAIN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, context }),
      signal: controller.signal
    });
    if (res.status === 503 || res.status === 404 || res.status === 405) {
      brainAvailable = false; // sem chave ou sem função: usa o Concierge por regras
      throw new Error(`cérebro indisponível (${res.status})`);
    }
    if (!res.ok) throw new Error(`falha no cérebro (${res.status})`);
    const data = await res.json();
    lastModel = data.model || null;
    return data.message;
  } finally {
    clearTimeout(timeout);
  }
}

function resolveCity(name, vocabulary) {
  if (!name) return null;
  const key = normalizeText(name.split('-')[0]);
  return vocabulary.cities.find(c => c.keys.includes(key) || normalizeText(c.shortLabel) === key) || null;
}

// "Jurerê" casa com "Jurerê"; "jurere internacional" com "Jurerê Internacional".
function resolveNeighborhood(name, vocabulary, city) {
  const key = normalizeText(name.replace(/\(.*?\)/g, ''));
  if (!key) return null;
  const cityKey = city ? normalizeText(city.shortLabel) : null;
  const pool = vocabulary.neighborhoods.filter(n => !cityKey || n.cityKey === cityKey);
  return pool.find(n => n.key === key) || pool.find(n => n.key.includes(key) || key.includes(n.key)) || null;
}

function resolveAmenity(name, vocabulary) {
  const key = normalizeText(name);
  return vocabulary.amenities.find(a =>
    normalizeText(a.label) === key || a.keys.some(k => key.includes(k) || k.includes(key))
  ) || null;
}

const summarize = (p, match) => ({
  id: p.id,
  tipo: p.type,
  bairro: p.neighborhood,
  cidade: p.city,
  preco: p.price,
  // Valor pronto para citar: o modelo copia em vez de converter (evita erro de número)
  preco_texto: `R$ ${Number(p.price || 0).toLocaleString('pt-BR')}`,
  // Mesmo cálculo do cartão do site (preço ÷ área); pronto para citar, sem o modelo fazer conta
  ...(p.price > 0 && p.area > 0
    ? { preco_m2_texto: `R$ ${Math.round(p.price / p.area).toLocaleString('pt-BR')} por m²` }
    : {}),
  quartos: p.bedrooms,
  suites: p.suites,
  area_m2: p.area,
  vagas: p.parking,
  ...(match?.whyNot?.length ? { o_que_nao_atende: match.whyNot } : {})
});

/**
 * Executa buscar_imoveis sobre o catálogo.
 * @returns {{ result: object, criteria: object }} result vai para o modelo;
 *   criteria é aplicado ao perfil do comprador (painel dos 4 pilares).
 */
export function searchCatalog(args, { allProperties, vocabulary }) {
  const avisos = [];
  let city = resolveCity(args.cidade, vocabulary);
  if (args.cidade && !city) avisos.push(`Cidade "${args.cidade}" não está no catálogo.`);

  const neighborhoods = [];
  const neighborhoodCities = new Set();
  (args.bairros || []).forEach(b => {
    const found = resolveNeighborhood(b, vocabulary, city);
    if (found) {
      if (!neighborhoods.includes(found.label)) neighborhoods.push(found.label);
      neighborhoodCities.add(found.cityKey);
    } else {
      avisos.push(`Bairro "${b}" não está no catálogo${city ? ` de ${city.shortLabel}` : ''}.`);
    }
  });
  // Só o bairro foi dito: a cidade vem dele (ex.: Jurerê → Florianópolis)
  if (!city && neighborhoodCities.size === 1) {
    const [cityKey] = neighborhoodCities;
    city = vocabulary.cities.find(c => normalizeText(c.shortLabel) === cityKey) || null;
  }

  const amenities = [];
  (args.comodidades || []).forEach(c => {
    const found = resolveAmenity(c, vocabulary);
    if (found) {
      if (!amenities.includes(found.label)) amenities.push(found.label);
    } else {
      avisos.push(`Comodidade "${c}" não está cadastrada nos imóveis; não dá para filtrar por ela.`);
    }
  });

  // Orçamento de compra abaixo de R$ 100 mil quase sempre é aluguel ou "mil" confundido
  // com "milhão": não filtra por ele e manda o modelo confirmar com a pessoa.
  let budget = typeof args.orcamento_max === 'number' && args.orcamento_max > 0 ? args.orcamento_max : NO_BUDGET;
  if (budget < MIN_PLAUSIBLE_BUDGET) {
    avisos.push(`O valor ${budget} é baixo demais para a compra de um imóvel (parece aluguel ou engano). Não foi usado no filtro: confirme o orçamento com a pessoa.`);
    budget = NO_BUDGET;
  } else if (budget >= 1_000_000_000) {
    avisos.push('O orçamento informado é implausível e não foi usado. Confirme o valor com a pessoa.');
    budget = NO_BUDGET;
  }

  const criteria = {
    city,
    neighborhoods,
    propertyType: args.tipo || 'Todos',
    minBedrooms: Number.isInteger(args.quartos_min) && args.quartos_min > 0 ? args.quartos_min : 0,
    maxBudget: budget,
    amenities
  };

  const profile = {
    location: { city: city?.label || '', neighborhoods },
    typology: { propertyType: criteria.propertyType, minBedrooms: criteria.minBedrooms },
    budget: { maxBudget: criteria.maxBudget },
    lifestyle: { amenities }
  };

  const cityFilter = (city?.shortLabel || '').toLowerCase();
  const pool = cityFilter
    ? allProperties.filter(p => (p.city || '').toLowerCase().includes(cityFilter))
    : allProperties;
  const scored = pool.map(p => ({ p, m: calculatePropertyMatch(p, profile) }));
  const active = scored.some(s => s.m.hasActiveProfile);
  const compatible = active ? scored.filter(s => s.m.criteriaMet === s.m.totalCriteria) : scored;
  compatible.sort((a, b) => (b.p.price || 0) - (a.p.price || 0));

  const result = {
    total_compativeis: compatible.length,
    criterios_aplicados: {
      cidade: city?.label || null,
      bairros: neighborhoods,
      tipo: args.tipo || null,
      quartos_min: criteria.minBedrooms || null,
      orcamento_max: criteria.maxBudget < NO_BUDGET ? criteria.maxBudget : null,
      comodidades: amenities
    },
    imoveis: compatible.slice(0, MAX_LISTED).map(s => summarize(s.p))
  };
  if (compatible.length === 0 && active) {
    // Os mais próximos ajudam a sugerir o que flexibilizar
    result.mais_proximos = scored
      .sort((a, b) => (b.m.score || 0) - (a.m.score || 0))
      .slice(0, 3)
      .map(s => summarize(s.p, s.m));
  }
  if (avisos.length) result.avisos = avisos;
  return { result, criteria };
}
