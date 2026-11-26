/**
 * acessoClient.js
 * Lê de que estado (UF) vem o acesso (para abrir o portal nele) e registra, no máximo uma vez por
 * sessão do navegador, a estatística de acessos por estado.
 * Só grava país e UF (sem IP nem identificador). Depende de TRACK_ACCESS_REGION=on no servidor e
 * da migração supabase/migrations/20261117120000_concierge_acessos.sql; fora disso não faz nada.
 */
import { saveAcesso } from './conciergeLeadsClient';

const SESSION_KEY = 'urs_acesso_registrado';

let regiaoDoVisitante = null;

/**
 * Estado (UF) de onde vem o acesso: { pais, uf, ativo }. Uma chamada por carregamento da página.
 * `?uf=RS` na URL tem prioridade (testes e links de anúncio por estado). Nunca rejeita.
 */
export function lerRegiaoDoVisitante() {
  if (!regiaoDoVisitante) {
    regiaoDoVisitante = (async () => {
      const daUrl = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('uf');
      if (daUrl && /^[a-z]{2}$/i.test(daUrl)) return { pais: 'BR', uf: daUrl.toUpperCase(), ativo: false, origem: 'url' };
      try {
        const res = await fetch('/api/regiao', { cache: 'no-store' });
        if (!res.ok) return {};
        return { ...(await res.json()), origem: 'rede' };
      } catch {
        return {};
      }
    })();
  }
  return regiaoDoVisitante;
}

export async function registrarAcesso() {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // sem sessionStorage (janela privada): segue e pode registrar de novo na próxima visita
  }
  try {
    const { ativo, pais, uf, origem } = await lerRegiaoDoVisitante();
    if (!ativo || !pais || origem !== 'rede') return; // desligado, sem cabeçalho (ex.: local) ou forçado pela URL
    await saveAcesso({ pais, uf: uf || null });
  } catch {
    // melhor esforço: nunca atrapalha o uso do site
  }
}
