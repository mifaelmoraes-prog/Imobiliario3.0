/**
 * conciergeParser.js
 * Funções puras de extração usadas pelo Concierge (US-02).
 */

// Converte "1.200.000", "1,5", "1.8", "950.000,00" em número.
function parseBrazilianNumber(raw) {
  let s = raw.trim();
  // Separador de milhar: grupos de 3 dígitos após ponto (ex.: 1.200.000)
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Extrai o teto orçamentário de um texto livre em pt-BR.
 * Aceita: "até 800 mil", "1,5 milhão", "2 milhões", "2 mi", "R$ 950.000", "1.200.000".
 * Retorna o valor em reais ou null se nada plausível for encontrado.
 */
export function extractBudget(text) {
  const lower = text.toLowerCase();

  // 1. Número + unidade por extenso. "mil" precisa ser testado antes de "mi".
  const withUnit = lower.match(/(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(milh(?:ões|oes|ão|ao)|mil(?![a-zà-ú])|mi(?![a-zà-ú])|kk?(?![a-z]))/);
  if (withUnit) {
    const num = parseBrazilianNumber(withUnit[1]);
    const unit = withUnit[2];
    if (num !== null) {
      const val = unit === 'mil' || unit === 'k' ? num * 1_000 : num * 1_000_000;
      return val >= 50_000 ? Math.round(val) : null;
    }
  }

  // 2. Valor monetário sem unidade: "R$ 950.000", "1.200.000" ou "R$ 750000".
  const plain = lower.match(/(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)/) || lower.match(/r\$\s*(\d{5,})/);
  if (plain) {
    const val = parseBrazilianNumber(plain[1]);
    if (val !== null && val >= 50_000) return Math.round(val);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Vocabulário derivado do catálogo (bairros, cidades e comodidades)
// ---------------------------------------------------------------------------

/** Minúsculas, sem acentos e com espaços normalizados. */
export function normalizeText(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9$.,]+/g, ' ')
    .trim();
}

// Apelidos de cidade e nomes de estado (normalizados). O estado só resolve a
// cidade porque o catálogo tem uma cidade por estado.
const CITY_ALIASES = {
  'sao paulo': ['sp', 'sampa'],
  'rio de janeiro': ['rio', 'rj'],
  'belo horizonte': ['bh', 'minas gerais', 'mg'],
  'vitoria': ['espirito santo', 'es'],
  'curitiba': ['parana', 'pr'],
  'florianopolis': ['floripa', 'santa catarina', 'sc'],
  'porto alegre': ['poa', 'rio grande do sul', 'rs']
};

// Siglas curtas são palavras comuns ("es", "pr"...): só valem em maiúsculas no texto original.
const UPPERCASE_ONLY_ALIASES = new Set(['sp', 'rj', 'mg', 'es', 'pr', 'sc', 'rs', 'bh', 'poa']);

// Bairros cujo nome é palavra comum ou colide com outra cidade: só valem se a
// cidade também for citada na mensagem.
const AMBIGUOUS_NEIGHBORHOODS = new Set([
  'centro', 'pilares', 'republica', 'piedade', 'esplanada', 'renascenca', 'penha',
  'abraao', 'goiania', 'guaruja', 'ipanema', 'ponta grossa', 'california', 'havai',
  'canaa', 'coqueiros', 'santa cruz', 'sao luiz', 'cidade nova', 'cidade industrial',
  'bela vista', 'jardim botanico'
]);

// Sinônimos por comodidade do catálogo (chaves já normalizadas).
const AMENITY_SYNONYMS = {
  'Varanda Gourmet': ['varanda gourmet', 'sacada gourmet', 'espaco gourmet'],
  'Sol da Manhã': ['sol da manha', 'sol nascente', 'face norte', 'luz da manha'],
  'Rua Silenciosa': ['rua silenciosa', 'silencioso', 'silenciosa', 'tranquilo', 'tranquila', 'sem barulho'],
  'Segurança 24h': ['seguranca 24h', 'seguranca 24 h', 'seguranca', 'portaria 24h', 'portaria 24 horas'],
  'Cozinha Americana': ['cozinha americana', 'cozinha integrada', 'cozinha aberta']
};

// Comodidades que as pessoas pedem mas o catálogo ainda não registra.
const UNSUPPORTED_AMENITIES = {
  'Piscina': ['piscina'],
  'Academia': ['academia'],
  'Churrasqueira': ['churrasqueira'],
  'Pet Friendly': ['pet friendly', 'aceita pet', 'aceita animais', 'cachorro', 'gato']
};

const PLACEHOLDER_NEIGHBORHOOD = /^bairro nobre de /;

/**
 * Monta o vocabulário a partir dos imóveis do catálogo.
 * @returns {{ cities: Array, neighborhoods: Array, amenities: Array }}
 */
export function buildVocabulary(properties = []) {
  const cityMap = new Map();
  const neighborhoodMap = new Map();
  const amenitySet = new Set();

  properties.forEach(p => {
    if (p.city) {
      const name = p.city.split('-')[0].trim();
      const key = normalizeText(name);
      if (!cityMap.has(key)) {
        cityMap.set(key, { label: p.city, shortLabel: name, keys: [key, ...(CITY_ALIASES[key] || [])] });
      }
    }
    if (p.neighborhood && p.city) {
      // "Jardim Felicidade (Zona Oeste)" → "jardim felicidade"
      const key = normalizeText(p.neighborhood.replace(/\(.*?\)/g, ''));
      const cityKey = normalizeText(p.city.split('-')[0]);
      const id = `${cityKey}|${key}`;
      if (key && !PLACEHOLDER_NEIGHBORHOOD.test(key) && !neighborhoodMap.has(id)) {
        neighborhoodMap.set(id, { label: p.neighborhood, key, cityKey, ambiguous: AMBIGUOUS_NEIGHBORHOODS.has(key) });
      }
    }
    (p.amenities || []).forEach(a => amenitySet.add(a));
  });

  const amenities = [...amenitySet].map(label => ({
    label,
    keys: AMENITY_SYNONYMS[label] || [normalizeText(label)]
  }));

  return { cities: [...cityMap.values()], neighborhoods: [...neighborhoodMap.values()], amenities };
}

// Procura `key` como palavra inteira no texto normalizado; retorna o índice ou -1.
function findWord(haystack, key) {
  const re = new RegExp(`(^|[^a-z0-9])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[^a-z0-9]|$)`);
  const m = re.exec(haystack);
  return m ? m.index + m[1].length : -1;
}

// Remove do texto o trecho encontrado para que termos menores não casem de novo
// (ex.: "rio" dentro de "Ingleses do Rio Vermelho").
function mask(haystack, index, length) {
  return haystack.slice(0, index) + ' '.repeat(length) + haystack.slice(index + length);
}

/**
 * Extrai cidade, bairros e comodidades de uma mensagem usando o vocabulário.
 * @returns {{ city: object|null, neighborhoods: string[], amenities: string[], unsupportedAmenities: string[] }}
 */
export function extractLocationAndLifestyle(text, vocabulary) {
  let haystack = normalizeText(text);
  const result = { city: null, neighborhoods: [], amenities: [], unsupportedAmenities: [] };

  // 1. Bairros: nomes mais longos primeiro, para "Jurerê Internacional" vencer "Jurerê".
  const found = [];
  [...vocabulary.neighborhoods]
    .sort((a, b) => b.key.length - a.key.length)
    .forEach(nh => {
      const idx = findWord(haystack, nh.key);
      if (idx >= 0) {
        found.push(nh);
        haystack = mask(haystack, idx, nh.key.length);
      }
    });

  // 2. Cidade (após mascarar bairros). Chaves mais longas primeiro, para
  // "rio grande do sul" vencer "rio".
  const original = text || '';
  const cityKeys = vocabulary.cities
    .flatMap(city => city.keys.map(key => ({ key, city })))
    .sort((a, b) => b.key.length - a.key.length);
  for (const { key, city } of cityKeys) {
    const hit = UPPERCASE_ONLY_ALIASES.has(key)
      ? new RegExp(`(^|[^A-Za-z])${key.toUpperCase()}(?=[^A-Za-z]|$)`).test(original)
      : findWord(haystack, key) >= 0;
    if (hit) {
      result.city = city;
      break;
    }
  }

  // Bairros ambíguos só contam com a cidade citada; com cidade citada, só os dela.
  const cityKey = result.city ? normalizeText(result.city.shortLabel) : null;
  result.neighborhoods = found
    .filter(nh => (cityKey ? nh.cityKey === cityKey : !nh.ambiguous))
    .map(nh => nh.label);

  // 3. Comodidades do catálogo e pedidas que o catálogo ainda não cobre.
  vocabulary.amenities.forEach(a => {
    if (a.keys.some(k => findWord(haystack, k) >= 0)) result.amenities.push(a.label);
  });
  Object.entries(UNSUPPORTED_AMENITIES).forEach(([label, keys]) => {
    if (keys.some(k => findWord(haystack, k) >= 0)) result.unsupportedAmenities.push(label);
  });

  return result;
}

const NUMBER_WORDS = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6 };

/** "3 quartos", "três dormitórios", "2 dorms" → número mínimo de quartos. */
export function extractBedrooms(text) {
  const n = normalizeText(text);
  const m = n.match(/(\d+|um|uma|dois|duas|tres|quatro|cinco|seis)\s*(quartos?|dorms?|dormitorios?)(?![a-z])/);
  if (!m) return null;
  const value = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : NUMBER_WORDS[m[1]];
  return value > 0 && value <= 10 ? value : null;
}

/** Tipo de imóvel como palavra inteira ("casal" não vira Casa). */
export function extractPropertyType(text) {
  const n = normalizeText(text);
  if (findWord(n, 'cobertura') >= 0) return 'Cobertura';
  if (['apartamento', 'apto', 'ap', 'flat'].some(k => findWord(n, k) >= 0)) return 'Apartamento';
  if (['casa', 'sobrado', 'terrea'].some(k => findWord(n, k) >= 0)) return 'Casa';
  return null;
}
