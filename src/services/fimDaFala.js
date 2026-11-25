/**
 * fimDaFala.js
 * Quanto tempo de silêncio esperar antes de considerar que a pessoa terminou de falar.
 * Antes era 1,6 s fixo, e uma pausa para pensar ("quero uma casa… em…") já fazia o
 * atendimento responder no meio da frase (relato do Paulo, no PC com internet boa).
 */
const ESPERA_PADRAO_MS = 2400;
const ESPERA_FRASE_INCOMPLETA_MS = 4000;
const ESPERA_FRASE_CURTA_MS = 3000;

// A frase parece incompleta quando termina num conectivo ou num "começo" de ideia
const FINAIS_INCOMPLETOS = new Set([
  'e', 'ou', 'mas', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'com', 'sem', 'para', 'pra',
  'por', 'que', 'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'ate', 'tipo', 'entao', 'tambem', 'quero',
  'queria', 'gostaria', 'procuro', 'estou', 'tenho', 'mais', 'menos', 'perto', 'tipo', 'assim', 'ne', 'eh', 'hum', 'ah'
]);

const normalizar = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** @param {string} textoAteAgora o que já foi transcrito @returns {number} milissegundos */
export function esperaFimDaFala(textoAteAgora) {
  const n = normalizar(textoAteAgora);
  if (!n) return ESPERA_PADRAO_MS;
  const palavras = n.split(' ');
  if (FINAIS_INCOMPLETOS.has(palavras[palavras.length - 1])) return ESPERA_FRASE_INCOMPLETA_MS;
  if (palavras.length <= 2) return ESPERA_FRASE_CURTA_MS;
  return ESPERA_PADRAO_MS;
}
