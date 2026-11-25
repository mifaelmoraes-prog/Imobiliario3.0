/**
 * buscaLivre.js
 * Entende o que a pessoa digita ou fala na busca do topo ("casa de aluguel em São Paulo",
 * "casa de praia em Xangri-lá RS") e devolve critérios, em vez de procurar a frase inteira
 * como um bloco só. Quando a região não existe no catálogo, separa imóveis de perfil parecido
 * e monta o aviso (pedido do Mifael e do Paulo).
 */
import {
  normalizeText, extractLocationAndLifestyle, extractPropertyType, extractBedrooms, extractBudget
} from './conciergeParser.js';

// Cidades do catálogo com praia (chaves normalizadas, sem a sigla do estado)
const LITORAL = new Set(['rio de janeiro', 'vitoria', 'florianopolis', 'bertioga', 'sao sebastiao', 'caraguatatuba', 'ubatuba']);

const ESTADOS = {
  sp: 'SP', 'sao paulo': 'SP', rj: 'RJ', 'rio de janeiro': 'RJ', mg: 'MG', 'minas gerais': 'MG', 'minas': 'MG',
  es: 'ES', 'espirito santo': 'ES', pr: 'PR', parana: 'PR', sc: 'SC', 'santa catarina': 'SC',
  rs: 'RS', 'rio grande do sul': 'RS'
};

// Palavras que encerram o nome do lugar depois de "em/no/na" ("em Batel até 2 milhões")
const FIM_DO_LUGAR = new Set(['ate', 'com', 'por', 'para', 'pra', 'que', 'e', 'perto', 'proximo', 'abaixo', 'acima', 'mais', 'menos', 'sem', 'tipo']);
const CONECTIVOS = new Set(['de', 'do', 'da', 'dos', 'das']);
const PLURAL = { Casa: 'casas', Apartamento: 'apartamentos', Cobertura: 'coberturas' };

const cidadeSemUf = (cidade) => normalizeText(String(cidade || '').split('-')[0]);
const ufDaCidade = (cidade) => (String(cidade || '').split('-')[1] || '').trim().toUpperCase();

/** Trecho depois do último "em/no/na/nas/nos", até uma palavra que encerra o lugar ou um número. */
function trechoDoLugar(n) {
  const m = [...n.matchAll(/(?:^| )(?:em|no|na|nos|nas) ((?:[a-z]+(?:-[a-z]+)*)(?: [a-z]+(?:-[a-z]+)*)*)/g)].pop();
  if (!m) return null;
  const palavras = [];
  for (const p of m[1].split(' ')) {
    if (FIM_DO_LUGAR.has(p) && palavras.length) break;
    palavras.push(p);
  }
  while (palavras.length && CONECTIVOS.has(palavras[palavras.length - 1])) palavras.pop();
  return palavras.join(' ').trim() || null;
}

/** Separa a sigla ou o nome do estado no fim do trecho ("xangri-la rs" → lugar "xangri-la", UF "RS"). */
function separarEstado(trecho) {
  for (const [nome, uf] of Object.entries(ESTADOS).sort((a, b) => b[0].length - a[0].length)) {
    if (trecho === nome) return { lugar: '', uf };
    if (trecho.endsWith(` ${nome}`)) return { lugar: trecho.slice(0, -nome.length - 1).trim(), uf };
  }
  return { lugar: trecho, uf: null };
}

function existe(lugar, vocabulary) {
  return vocabulary.cities.some(c => c.keys.includes(lugar) || cidadeSemUf(c.label) === lugar) ||
    vocabulary.neighborhoods.some(b => b.key === lugar);
}

// Conhecido se o lugar, ou algum começo dele, está no catálogo
// ("vitoria de frente" → "vitoria"; "barra da tijuca" inteiro)
function lugarConhecido(lugar, vocabulary) {
  if (!lugar) return true;
  const palavras = lugar.split(' ');
  for (let n = palavras.length; n > 0; n--) {
    if (existe(palavras.slice(0, n).join(' '), vocabulary)) return true;
  }
  return false;
}

// Volta ao texto original com a capitalização que a pessoa usou ("Xangri-lá")
function nomeOriginal(texto, lugarNormalizado) {
  const palavras = String(texto).split(/\s+/);
  for (let i = 0; i < palavras.length; i++) {
    for (let j = i + 1; j <= palavras.length; j++) {
      const trecho = palavras.slice(i, j).join(' ').replace(/[.,;!?]+$/, '');
      if (normalizeText(trecho) === lugarNormalizado) return trecho;
    }
  }
  return lugarNormalizado;
}

/**
 * @returns {null | {
 *   tipo, quartos, orcamento, cidade, bairros, comodidades, aluguel, praia, uf, lugarDesconhecido
 * }} null quando o texto não tem nenhum critério reconhecível (vale a busca literal)
 */
export function interpretarBusca(texto, vocabulary) {
  const n = normalizeText(texto);
  if (!n) return null;

  const aluguel = /\b(aluguel|alugar|aluga|locacao|locar)\b/.test(n);
  const praia = /\b(praia|beira mar|pe na areia|litoral|frente para o mar|vista para o mar)\b/.test(n);

  let lugarDesconhecido = null;
  let uf = null;
  const trecho = trechoDoLugar(n);
  if (trecho) {
    const separado = separarEstado(trecho);
    uf = separado.uf;
    if (!lugarConhecido(separado.lugar, vocabulary)) lugarDesconhecido = nomeOriginal(texto, separado.lugar);
  }

  const local = extractLocationAndLifestyle(texto, vocabulary);
  const resultado = {
    tipo: extractPropertyType(texto),
    quartos: extractBedrooms(texto),
    orcamento: extractBudget(texto),
    // Com um lugar desconhecido, a sigla do estado não pode virar a capital ("Xangri-lá RS" ≠ Porto Alegre)
    cidade: lugarDesconhecido ? null : local.city,
    bairros: lugarDesconhecido ? [] : local.neighborhoods,
    comodidades: local.amenities,
    aluguel,
    praia,
    uf,
    lugarDesconhecido
  };
  const temAlgo = resultado.tipo || resultado.quartos || resultado.orcamento || resultado.cidade ||
    resultado.bairros.length || resultado.comodidades.length || aluguel || praia || lugarDesconhecido;
  return temAlgo ? resultado : null;
}

const atende = (p, b, { semLugar = false } = {}) => {
  if (b.tipo && p.type !== b.tipo) return false;
  if (b.quartos && (p.bedrooms || 0) < b.quartos) return false;
  if (b.orcamento && (p.price || 0) > b.orcamento) return false;
  if (b.comodidades.length && !b.comodidades.every(c => (p.amenities || []).includes(c))) return false;
  if (semLugar) return true;
  if (b.cidade && cidadeSemUf(p.city) !== normalizeText(b.cidade.shortLabel)) return false;
  if (b.bairros.length && !b.bairros.includes(p.neighborhood)) return false;
  if (b.praia && !b.cidade && !b.bairros.length && !LITORAL.has(cidadeSemUf(p.city))) return false;
  return true;
};

/**
 * Aplica a busca interpretada à lista e devolve o que mostrar e o aviso (ou null).
 * @returns {{ imoveis: Array, aviso: string|null }}
 */
export function aplicarBusca(lista, b) {
  const oQue = PLURAL[b.tipo] || 'imóveis';
  const avisos = [];
  if (b.aluguel) avisos.push('No momento trabalhamos só com imóveis à venda.');

  if (b.lugarDesconhecido) {
    // Perfil parecido: praia → cidades do litoral; senão, o mesmo estado; senão, qualquer lugar
    const base = lista.filter(p => atende(p, b, { semLugar: true }));
    const praia = b.praia ? base.filter(p => LITORAL.has(cidadeSemUf(p.city))) : [];
    const mesmoEstado = b.uf ? base.filter(p => ufDaCidade(p.city) === b.uf) : [];
    const [similares, onde] = praia.length ? [praia, ' no litoral']
      : mesmoEstado.length ? [mesmoEstado, ` no ${b.uf}`]
        : [base, ''];
    const lugar = `${b.lugarDesconhecido}${b.uf ? ` (${b.uf})` : ''}`;
    avisos.push(similares.length
      ? `Ainda não temos imóveis em ${lugar}. Separamos ${oQue} com perfil parecido${onde}.`
      : `Ainda não temos imóveis em ${lugar}, nem opções parecidas no catálogo agora.`);
    return { imoveis: similares, aviso: avisos.join(' ') };
  }

  const imoveis = lista.filter(p => atende(p, b));
  if (b.aluguel && imoveis.length) {
    avisos.push(`Mostrando ${oQue} à venda${b.cidade ? ` em ${b.cidade.shortLabel}` : ''}.`);
  }
  if (!imoveis.length) avisos.push(`Não encontramos ${oQue} com esses critérios. Tente tirar um filtro ou fale com o atendimento.`);
  return { imoveis, aviso: avisos.length ? avisos.join(' ') : null };
}
