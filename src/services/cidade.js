// O catálogo guarda a cidade como "Cidade - UF". Separar pelo primeiro hífen quebra nomes como
// "Xangri-Lá - RS" (virava "Xangri"), então a UF é sempre lida só do fim.
const SUFIXO_UF = /\s*-\s*([A-Za-z]{2})\s*$/;

/** "Xangri-Lá - RS" → "Xangri-Lá"; "São Paulo - SP" → "São Paulo". */
export const nomeDaCidade = (cidade) => String(cidade || '').replace(SUFIXO_UF, '').trim();

/** "Xangri-Lá - RS" → "RS"; sem UF → "". */
export const ufDaCidade = (cidade) => (String(cidade || '').match(SUFIXO_UF)?.[1] || '').toUpperCase();
