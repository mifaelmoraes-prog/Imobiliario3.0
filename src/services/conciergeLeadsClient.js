/**
 * conciergeLeadsClient.js
 * Grava no Supabase os alertas e os contatos pedidos no Concierge. O navegador só insere
 * (RLS na migração supabase/migrations/20261113120000_concierge_alertas.sql).
 */
import { supabase } from './supabaseClient';

const TIMEOUT_MS = 8000;

async function insertRow(table, row) {
  if (!supabase) return { ok: false, motivo: 'indisponivel' };
  try {
    const request = supabase.from(table).insert(row); // sem .select(): o navegador não pode ler
    const timeout = new Promise(resolve => setTimeout(() => resolve({ error: { message: 'timeout' } }), TIMEOUT_MS));
    const { error } = await Promise.race([request, timeout]);
    if (!error) return { ok: true };
    console.warn(`[concierge] falha ao gravar em ${table}:`, error.message);
    return { ok: false, motivo: /limite_de_alertas/.test(error.message || '') ? 'limite' : 'indisponivel' };
  } catch (err) {
    console.warn(`[concierge] falha ao gravar em ${table}:`, err?.message || err);
    return { ok: false, motivo: 'indisponivel' };
  }
}

/** @returns {Promise<{ok: boolean, motivo?: 'limite'|'indisponivel'}>} */
export const saveAlert = (row) => insertRow('concierge_alertas', row);

/** Contato de corretor: gravação "melhor esforço", não bloqueia o atendimento. */
export const saveLead = (row) => insertRow('concierge_leads', row);

/**
 * Pede ao servidor que avise a equipe por e-mail (/api/aviso-contato). Só "melhor esforço": o
 * contato já está salvo no Supabase, então qualquer falha aqui é ignorada e não muda o que o
 * visitante vê.
 */
export async function avisarContato(row) {
  try {
    const resposta = await fetch('/api/aviso-contato', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row)
    });
    return resposta.ok;
  } catch {
    return false;
  }
}

/** Feedback anônimo sobre o atendimento (texto e nota opcional). */
export const saveFeedback = (row) => insertRow('concierge_feedback', row);

/** Acesso ao site por estado (só país e UF, sem identificador). */
export const saveAcesso = (row) => insertRow('concierge_acessos', row);
