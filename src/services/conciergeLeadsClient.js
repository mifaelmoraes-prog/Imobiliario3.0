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
