/**
 * acessoClient.js
 * Registra, no máximo uma vez por sessão do navegador, de que estado (UF) veio o acesso.
 * Só grava país e UF (sem IP nem identificador). Depende de TRACK_ACCESS_REGION=on no servidor e
 * da migração supabase/migrations/20261117120000_concierge_acessos.sql; fora disso não faz nada.
 */
import { saveAcesso } from './conciergeLeadsClient';

const SESSION_KEY = 'urs_acesso_registrado';

export async function registrarAcesso() {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // sem sessionStorage (janela privada): segue e pode registrar de novo na próxima visita
  }
  try {
    const res = await fetch('/api/regiao', { cache: 'no-store' });
    if (!res.ok) return;
    const { ativo, pais, uf } = await res.json();
    if (!ativo || !pais) return; // desligado, ou sem cabeçalho (ex.: ambiente local)
    await saveAcesso({ pais, uf: uf || null });
  } catch {
    // melhor esforço: nunca atrapalha o uso do site
  }
}
