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
  ...(p.condoFee > 0 ? { condominio_texto: `R$ ${Number(p.condoFee).toLocaleString('pt-BR')} por mês` } : {}),
  ...(p.iptuMonthly > 0 ? { iptu_texto: `R$ ${Number(p.iptuMonthly).toLocaleString('pt-BR')} por mês` } : {}),
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

// ---------------------------------------------------------------------------
// Perfil do visitante: o que ele já fez no site, para o Concierge não começar do zero
// ---------------------------------------------------------------------------

const ACTION_LABELS = {
  MORTGAGE_SIMULATION: 'simulou financiamento',
  WHATSAPP_CLICK: 'clicou para falar no WhatsApp',
  SCHEDULE_VISIT: 'pediu visita',
  DOSSIER_DOWNLOAD: 'baixou o dossiê',
  PREREQUISITES_ANALYSIS: 'analisou pré-requisitos de um imóvel'
};

const brief = (p) => ({
  id: p.id,
  tipo: p.type,
  bairro: p.neighborhood,
  cidade: p.city,
  preco_texto: `R$ ${Number(p.price || 0).toLocaleString('pt-BR')}`
});

/**
 * Resume filtros, imóveis vistos, favoritos e ações do visitante (dados que o próprio site já
 * guarda no navegador). Devolve null se ainda não há nada relevante.
 */
export function buildVisitorContext({ profile, timeline = [], favorites = [], allProperties = [], selectedCity = '', searchQuery = '' }) {
  const byId = new Map(allProperties.map(p => [p.id, p]));
  const neighborhoods = profile?.location?.neighborhoods || [];
  // A cidade padrão do perfil não foi escolhida pela pessoa: vale o filtro de cidade do site
  // ou, se houver bairros, a cidade deles.
  const cidade = selectedCity || (neighborhoods.length ? profile?.location?.city : null) || null;
  const tipo = profile?.typology?.propertyType;
  const maxBudget = profile?.budget?.maxBudget;

  const criterios = {
    cidade,
    bairros: neighborhoods.slice(0, 5),
    tipo: tipo && tipo !== 'Todos' ? tipo : null,
    quartos_min: profile?.typology?.minBedrooms > 0 ? profile.typology.minBedrooms : null,
    orcamento_max: maxBudget > 0 && maxBudget < NO_BUDGET ? maxBudget : null,
    comodidades: (profile?.lifestyle?.amenities || []).slice(0, 8)
  };
  const hasCriterios = Boolean(criterios.cidade || criterios.bairros.length || criterios.tipo ||
    criterios.quartos_min || criterios.orcamento_max || criterios.comodidades.length);

  // A linha do tempo vem da mais recente para a mais antiga
  const vistosIds = [];
  timeline.forEach(e => {
    const id = e?.metadata?.propertyId;
    if (e?.type === 'VIEW_PROPERTY' && id && !vistosIds.includes(id)) vistosIds.push(id);
  });
  const imoveis_vistos = vistosIds.map(id => byId.get(id)).filter(Boolean).slice(0, 5).map(brief);
  const favoritos = favorites.map(id => byId.get(id)).filter(Boolean).slice(0, 5).map(brief);

  const acoes = [...new Set(timeline.map(e => ACTION_LABELS[e?.type]).filter(Boolean))];
  const criticas = timeline.filter(e => e?.type === 'PROPERTY_CRITICISM').slice(0, 2)
    .map(e => String(e.description || '').slice(0, 200));
  const busca_texto = String(searchQuery || '').trim().slice(0, 80) || null;
  const nome = profile?.metadata?.isIdentified && profile.metadata.leadName
    ? String(profile.metadata.leadName).trim().slice(0, 60) : null;

  if (!hasCriterios && !imoveis_vistos.length && !favoritos.length && !acoes.length && !criticas.length && !busca_texto) return null;
  return { criterios, busca_texto, imoveis_vistos, favoritos, acoes, criticas, nome };
}

const TYPE_PLURAL = { Casa: 'casas', Apartamento: 'apartamentos', Cobertura: 'coberturas' };

/** Saudação personalizada quando já sabemos algo do visitante; null mantém a saudação padrão. */
export function buildGreeting(visitor) {
  if (!visitor) return null;
  const c = visitor.criterios || {};
  const first = visitor.nome ? ` ${visitor.nome.split(' ')[0]}` : '';
  const hi = `Olá${first}! Sou o Concierge da Urban Real State.`;
  const local = c.bairros?.[0] || c.cidade || null;
  if (c.tipo || local) {
    return `${hi} Vi que você está de olho em ${TYPE_PLURAL[c.tipo] || 'imóveis'}${local ? ` em ${local}` : ''}. Quer que eu mostre as melhores opções ou prefere ajustar algo?`;
  }
  const last = visitor.imoveis_vistos?.[0] || visitor.favoritos?.[0];
  if (last?.tipo && last?.bairro) {
    const kind = String(last.tipo).toLowerCase();
    return `${hi} Vi que você olhou ${kind === 'apartamento' ? 'um' : 'uma'} ${kind} em ${last.bairro}. Quer ver opções parecidas?`;
  }
  return null;
}
