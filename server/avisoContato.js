// POST /api/aviso-contato → avisa a equipe por e-mail que chegou um contato de corretor.
// O contato em si já foi gravado pelo navegador no Supabase; aqui só se manda o aviso (Resend).
// Desligado por padrão: só envia se LEAD_NOTIFY_EMAIL e RESEND_API_KEY estiverem configurados.
import { guardRequest } from './guard.js';

const HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const json = (status, obj, extra = {}) => ({ status, headers: { ...HEADERS, ...extra }, body: JSON.stringify(obj) });
const TIMEOUT_MS = 8000;

const texto = (valor, max) => (typeof valor === 'string' ? valor.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : '');
const esc = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Limpa os campos recebidos do navegador (tudo é texto não confiável). Devolve null se não houver nome. */
export function limparContato(body) {
  const nome = texto(body?.nome, 120);
  if (!nome) return null;
  const ids = Array.isArray(body?.imoveis_ids) ? body.imoveis_ids.map(i => texto(String(i), 60)).filter(Boolean).slice(0, 5) : [];
  return {
    nome,
    telefone: texto(body?.telefone, 40),
    email: texto(body?.email, 120),
    melhor_horario: texto(body?.melhor_horario, 120),
    finalidade: ['morar', 'investir'].includes(body?.finalidade) ? body.finalidade : '',
    prazo: texto(body?.prazo, 120),
    observacoes: texto(body?.observacoes, 500),
    imoveis_ids: ids
  };
}

/** Monta assunto, texto e HTML do aviso. */
export function montarAviso(c) {
  const linhas = [
    ['Nome', c.nome], ['Telefone', c.telefone], ['E-mail', c.email], ['Melhor horário', c.melhor_horario],
    ['Finalidade', c.finalidade], ['Prazo', c.prazo], ['Imóveis de interesse', c.imoveis_ids.join(', ')], ['Observações', c.observacoes]
  ].filter(([, v]) => v);
  return {
    subject: `Novo contato pelo atendimento do site: ${c.nome}`,
    text: `Um visitante pediu contato de corretor pelo atendimento do site.\n\n${linhas.map(([k, v]) => `${k}: ${v}`).join('\n')}\n`,
    html: `<p>Um visitante pediu contato de corretor pelo atendimento do site.</p><ul>${linhas.map(([k, v]) => `<li><b>${k}:</b> ${esc(v)}</li>`).join('')}</ul>`
  };
}

export async function handleAvisoContatoRequest({ method, body, origin, host, headers } = {}, env = process.env, fetchImpl = fetch) {
  if (method !== 'POST') return json(405, { error: 'method_not_allowed' }, { Allow: 'POST' });
  const blocked = guardRequest({ origin, host, headers }, { name: 'aviso', limit: 10, env });
  if (blocked) return json(blocked.status, { error: blocked.error }, blocked.retryAfter ? { 'Retry-After': String(blocked.retryAfter) } : {});

  const destino = (env.LEAD_NOTIFY_EMAIL || '').trim();
  if (!destino || !env.RESEND_API_KEY) return json(200, { enviado: false, motivo: 'desligado' });

  const contato = limparContato(body);
  if (!contato) return json(400, { error: 'contato_invalido' });
  const { subject, text, html } = montarAviso(contato);

  try {
    const resposta = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.LEAD_NOTIFY_FROM || 'Urban Real State <onboarding@resend.dev>',
        to: destino.split(',').map(s => s.trim()).filter(Boolean),
        subject, text, html,
        ...(contato.email && /^\S+@\S+\.\S+$/.test(contato.email) ? { reply_to: contato.email } : {})
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!resposta.ok) {
      console.warn('[aviso-contato] o serviço de e-mail recusou o envio:', resposta.status);
      return json(502, { enviado: false, motivo: 'servico_recusou' });
    }
    return json(200, { enviado: true });
  } catch (err) {
    console.warn('[aviso-contato] falha ao enviar:', err?.message || err);
    return json(502, { enviado: false, motivo: 'falha_de_rede' });
  }
}
