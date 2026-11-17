// Proteção das rotas que gastam dinheiro (/api/concierge e /api/tts):
//  1. só aceita chamadas feitas pela própria página (Origin, ou Referer na falta dele, igual ao host);
//  2. limita quantas chamadas cada visitante (IP) pode fazer numa janela de tempo.
//
// Limites reais: o contador fica na memória de cada instância da função, então vale por instância
// e zera quando ela é reiniciada. Barra uso descuidado e laços acidentais, mas não substitui o
// teto de gasto no painel da OpenAI/Google nem um limite global (Upstash/Vercel KV/WAF).

const JANELA_MS = 10 * 60 * 1000;
const MAX_CHAVES = 5000;
const baldes = new Map(); // "rota|ip" -> horários (ms) das chamadas dentro da janela

function mesmoHost(url, host) {
  try {
    return new URL(url).host === host;
  } catch {
    return false; // inclui Origin "null" (iframes isolados, arquivos locais)
  }
}

/** A chamada veio da própria página? Origin tem prioridade; sem ele, usa o Referer. */
export function checkOrigin({ origin, referer, host }) {
  if (!host) return false;
  const fonte = origin || referer;
  return Boolean(fonte) && mesmoHost(fonte, host);
}

/** IP do visitante. Na Vercel, x-forwarded-for é preenchido pela plataforma, não pelo cliente. */
export function clientKey(headers = {}) {
  const encaminhado = String(headers['x-forwarded-for'] ?? '').split(',')[0].trim();
  return encaminhado || String(headers['x-real-ip'] ?? '').trim() || 'desconhecido';
}

function limparAntigos(agora, janelaMs) {
  for (const [chave, horarios] of baldes) {
    if (!horarios.length || agora - horarios[horarios.length - 1] >= janelaMs) baldes.delete(chave);
  }
}

/** Registra uma chamada. @returns {{ ok: boolean, retryAfter?: number }} (retryAfter em segundos) */
export function takeToken(chave, { limit, janelaMs = JANELA_MS, agora = Date.now() }) {
  if (baldes.size > MAX_CHAVES) limparAntigos(agora, janelaMs);
  const recentes = (baldes.get(chave) ?? []).filter(t => agora - t < janelaMs);
  if (recentes.length >= limit) {
    baldes.set(chave, recentes);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((recentes[0] + janelaMs - agora) / 1000)) };
  }
  recentes.push(agora);
  baldes.set(chave, recentes);
  return { ok: true };
}

function limiteConfigurado(nome, padrao, env) {
  const n = Number.parseInt(env[`RATE_LIMIT_${nome.toUpperCase()}`], 10);
  return Number.isFinite(n) && n > 0 ? n : padrao;
}

/**
 * Valida origem e limite de uso de uma chamada.
 * @returns {null | { status: 403|429, error: string, retryAfter?: number }} null = pode seguir
 */
export function guardRequest({ origin, host, headers = {} }, { name, limit, env = process.env, agora } = {}) {
  const ok = checkOrigin({
    origin: origin ?? headers.origin,
    referer: headers.referer,
    host: host ?? headers.host
  });
  if (!ok) return { status: 403, error: 'forbidden' };

  const resultado = takeToken(`${name}|${clientKey(headers)}`, {
    limit: limiteConfigurado(name, limit, env),
    agora
  });
  if (!resultado.ok) return { status: 429, error: 'rate_limited', retryAfter: resultado.retryAfter };
  return null;
}

/** Só para testes. */
export function resetGuard() {
  baldes.clear();
}
