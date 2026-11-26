/**
 * regioes.js
 * Filtro de local em três níveis (pedido do Paulo: "mostrar primeiro a região"):
 * Região (Sudeste, Sul) → Estado → Cidade, com o atalho "Litoral" dentro de cada estado.
 * Prioridade combinada com o Edson: Sudeste e Sul, todos os estados.
 */
import { normalizeText } from './conciergeParser.js';
import { nomeDaCidade, ufDaCidade } from './cidade.js';

export const REGIOES = [
  { nome: 'Sudeste', ufs: ['SP', 'RJ', 'MG', 'ES'] },
  { nome: 'Sul', ufs: ['RS', 'SC', 'PR'] }
];

export const NOME_DO_ESTADO = {
  SP: 'São Paulo', RJ: 'Rio de Janeiro', MG: 'Minas Gerais', ES: 'Espírito Santo',
  PR: 'Paraná', SC: 'Santa Catarina', RS: 'Rio Grande do Sul'
};

// Cidades do catálogo com praia (chaves normalizadas, sem a UF)
const CIDADES_LITORAL = new Set([
  'rio de janeiro', 'vitoria', 'florianopolis', 'bertioga', 'sao sebastiao', 'caraguatatuba', 'ubatuba',
  'xangri la', 'capao da canoa', 'osorio' // Litoral Norte do RS
]);

/** "Xangri-Lá - RS" → true. */
export const ehLitoral = (cidade) => CIDADES_LITORAL.has(normalizeText(nomeDaCidade(cidade)));

/** "RS" → "Sul"; UF fora de Sudeste e Sul → null. */
export const regiaoDaUf = (uf) => REGIOES.find(r => r.ufs.includes(String(uf || '').toUpperCase()))?.nome || null;

/**
 * Aplica o filtro de local. `local` = { regiao, uf, litoral, cidade } (todos opcionais).
 * A cidade, quando marcada, vale mais que o resto.
 */
export function filtrarPorLocal(lista, local = {}) {
  const { regiao, uf, litoral, cidade } = local;
  if (cidade) {
    const alvo = normalizeText(cidade);
    return lista.filter(p => normalizeText(nomeDaCidade(p.city)) === alvo);
  }
  if (uf) {
    const doEstado = lista.filter(p => ufDaCidade(p.city) === uf);
    return litoral ? doEstado.filter(p => ehLitoral(p.city)) : doEstado;
  }
  if (regiao) {
    const ufs = REGIOES.find(r => r.nome === regiao)?.ufs || [];
    return lista.filter(p => ufs.includes(ufDaCidade(p.city)));
  }
  return lista;
}

/**
 * Árvore para os botões, só com o que tem imóvel:
 * [{ nome, total, estados: [{ uf, nome, total, litoral, cidades: [{ nome, total }] }] }]
 */
export function montarArvoreDeLocais(lista) {
  return REGIOES.map(r => {
    const estados = r.ufs.map(uf => {
      const doEstado = lista.filter(p => ufDaCidade(p.city) === uf);
      const porCidade = new Map();
      for (const p of doEstado) {
        const nome = nomeDaCidade(p.city);
        porCidade.set(nome, (porCidade.get(nome) || 0) + 1);
      }
      const cidades = [...porCidade].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
      return { uf, nome: NOME_DO_ESTADO[uf], total: doEstado.length, litoral: doEstado.filter(p => ehLitoral(p.city)).length, cidades };
    }).filter(e => e.total > 0);
    return { nome: r.nome, total: estados.reduce((s, e) => s + e.total, 0), estados };
  }).filter(r => r.total > 0);
}

/** Texto curto do filtro ativo ("Litoral de Rio Grande do Sul", "Sul", "Vitória"), ou "". */
export function descreverLocal({ regiao, uf, litoral, cidade } = {}) {
  if (cidade) return cidade;
  if (uf) return litoral ? `Litoral de ${NOME_DO_ESTADO[uf] || uf}` : NOME_DO_ESTADO[uf] || uf;
  return regiao || '';
}
