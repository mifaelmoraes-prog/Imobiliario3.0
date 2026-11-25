/**
 * avatarDaEpoca.js
 * Imagem do avatar do atendimento conforme a época do ano. No Natal (1º de dezembro a
 * 6 de janeiro, Dia de Reis) entra a versão com gorro e cachecol enviada pelo Mifael.
 * Para conferir antes da data, abra o site com ?avatar=natal.
 */
export const AVATAR_PADRAO = '/assets/atendimento-avatar.webp';
export const AVATAR_NATAL = '/assets/atendimento-avatar-natal.webp';

export function ehEpocaDeNatal(data = new Date()) {
  const mes = data.getMonth(); // 0 = janeiro
  const dia = data.getDate();
  return mes === 11 || (mes === 0 && dia <= 6);
}

/** @param {Date} [data] @param {string} [busca] location.search, para a prévia ?avatar=natal */
export function avatarDaEpoca(data = new Date(), busca = '') {
  if (/[?&]avatar=natal\b/.test(busca)) return AVATAR_NATAL;
  return ehEpocaDeNatal(data) ? AVATAR_NATAL : AVATAR_PADRAO;
}
