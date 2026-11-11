/**
 * conciergeBrain.js
 * Cérebro conversacional do Concierge (OpenAI Chat Completions com ferramentas).
 * O servidor só guarda o prompt e as definições das ferramentas; quem executa as
 * ferramentas é o navegador, que tem o catálogo e o motor de match. Assim o
 * modelo só fala de imóveis que o catálogo devolveu.
 * Usado por api/concierge.js (Vercel) e pela rota de desenvolvimento em vite.config.js.
 */
// Modelo principal e reservas: cada modelo tem a própria cota na OpenAI, então
// se um bater o limite o próximo da lista assume.
const MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-5.4-mini';
const FALLBACK_MODELS = (process.env.OPENAI_CHAT_FALLBACK_MODELS ?? 'gpt-4.1-mini,gpt-5.4-nano')
  .split(',').map(s => s.trim()).filter(Boolean);
const MODELS = [...new Set([MODEL, ...FALLBACK_MODELS])];
const exhaustedUntil = new Map(); // modelo → timestamp até quando pular
const REASONING_EFFORT = process.env.OPENAI_CHAT_REASONING ?? 'none';
const MAX_MESSAGES = 60;
const MAX_CONTENT_CHARS = 8000;

const SYSTEM_PROMPT = `Você é o Concierge da Urban Real State, um consultor imobiliário sênior de alto padrão.
Você conversa por voz e por texto com quem visita o site, em português do Brasil.

Seu objetivo é entender o que a pessoa procura, mostrar imóveis reais do catálogo que façam sentido e conduzir a conversa como um corretor experiente faria numa mesa de reunião: acolhedor, calmo, objetivo e sem parecer um formulário.

Marcos que você quer descobrir ao longo da conversa, na ordem que surgir naturalmente:
- localização (cidade e bairro) ou estilo de vida desejado;
- tipo de imóvel (casa, apartamento ou cobertura) e número de quartos;
- orçamento máximo;
- finalidade (morar ou investir) e prazo para a compra;
- por fim, o contato para um corretor dar continuidade (veja Fechamento).
Se a pessoa já contou algo, nunca pergunte de novo: reconheça e avance para o próximo marco.
Antes de fazer sua pergunta, releia o histórico: respostas indiretas contam (por exemplo, "investir 4 milhões" já diz que a finalidade é investimento e o orçamento é R$ 4.000.000).

Regras:
- Termine cada resposta com exatamente uma pergunta curta que avance para o próximo marco que ainda falta (por exemplo, depois de mostrar um imóvel, pergunte se é para morar ou investir). Evite fechos vagos como "se quiser, posso ajudar".
- Respostas curtas: 1 a 3 frases, porque elas são faladas em voz alta. Sem listas, sem markdown, sem emojis.
- Escreva valores por extenso em reais com número completo, por exemplo "R$ 650.000" ou "R$ 3.800.000".
- Nunca invente imóveis, preços, bairros ou características. Só fale de imóveis que vieram da ferramenta buscar_imoveis nesta conversa.
- Sempre que a pessoa der ou mudar um critério (cidade, bairro, tipo, quartos, orçamento, comodidade), chame buscar_imoveis com TODOS os critérios atuais da conversa, não só o novo.
- Quando houver poucos resultados (até 3), descreva brevemente o melhor deles e ofereça mostrá-lo.
- Quando a pessoa pedir para ver, quiser o link, os detalhes ou fotos, chame mostrar_imoveis com os ids. Os imóveis aparecem como cartões com botão "Ver detalhes" no chat: diga isso numa frase curta, sem repetir os dados do cartão.
- Se nada atender, diga o que mais limita (por exemplo o orçamento) e sugira flexibilizar um critério.
- Se a mensagem parecer cortada ou incompleta (por exemplo "eu quero"), peça com naturalidade para a pessoa continuar. Nunca deduza uma resposta que a pessoa não deu: "eu quero" não responde se é para morar ou investir.
- Se a pessoa pedir algo que o catálogo não tem (por exemplo uma comodidade não cadastrada), diga com honestidade.

Fechamento (o objetivo final é passar a pessoa para um corretor):
- Quando a pessoa mostrar interesse em imóveis específicos, disser que vai analisar, pedir visita, negociação ou um corretor, ofereça que um especialista da Urban Real State entre em contato para enviar mais informações e agendar uma visita.
- Se o prazo para a compra ainda não foi dito, pergunte antes ou junto dessa oferta (por exemplo: "Você pensa em comprar nos próximos meses?").
- Peça consentimento antes de pedir dados: só peça nome e WhatsApp (ou e-mail) se a pessoa aceitar o contato, e diga que serão usados só para esse atendimento.
- Depois pergunte o melhor dia e horário para o contato, se ela ainda não disse.
- Com nome e um contato em mãos, chame registrar_interesse com tudo o que você já sabe e confirme em uma frase que um corretor vai chamar no horário combinado.
- Se a pessoa recusar o contato, respeite e siga ajudando, sem insistir.
- Não peça dados de contato antes de ter mostrado imóveis que interessem à pessoa.`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'buscar_imoveis',
      description:
        'Aplica os critérios atuais da conversa ao catálogo e devolve quantos imóveis atendem e os principais. ' +
        'Envie sempre o conjunto completo de critérios; use null ou lista vazia para o que não foi definido.',
      strict: true,
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['cidade', 'bairros', 'tipo', 'quartos_min', 'orcamento_max', 'comodidades'],
        properties: {
          cidade: { type: ['string', 'null'], description: 'Nome da cidade, ex.: "Florianópolis".' },
          bairros: { type: 'array', items: { type: 'string' }, description: 'Bairros desejados, ex.: ["Jurerê"].' },
          tipo: { type: ['string', 'null'], enum: ['Casa', 'Apartamento', 'Cobertura', null] },
          quartos_min: { type: ['integer', 'null'] },
          orcamento_max: { type: ['number', 'null'], description: 'Valor máximo em reais, ex.: 4000000.' },
          comodidades: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'registrar_interesse',
      description:
        'Registra o interesse da pessoa para um corretor entrar em contato (visita, mais informações ou negociação). ' +
        'Só chame depois que a pessoa aceitou ser contatada e informou nome e telefone ou e-mail.',
      strict: true,
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['nome', 'telefone', 'email', 'melhor_horario', 'imoveis_ids', 'finalidade', 'prazo', 'observacoes'],
        properties: {
          nome: { type: 'string' },
          telefone: { type: ['string', 'null'], description: 'Telefone ou WhatsApp, como a pessoa disse.' },
          email: { type: ['string', 'null'] },
          melhor_horario: { type: ['string', 'null'], description: 'Ex.: "amanhã de manhã".' },
          imoveis_ids: { type: 'array', items: { type: 'string' }, description: 'Ids dos imóveis de interesse.' },
          finalidade: { type: ['string', 'null'], enum: ['morar', 'investir', null] },
          prazo: { type: ['string', 'null'], description: 'Prazo para a compra, como a pessoa disse.' },
          observacoes: { type: ['string', 'null'], description: 'Resumo curto do que a pessoa busca.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'mostrar_imoveis',
      description: 'Mostra no chat os cartões dos imóveis (com foto, preço e botão "Ver detalhes"). Use os ids devolvidos por buscar_imoveis.',
      strict: true,
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['ids'],
        properties: { ids: { type: 'array', items: { type: 'string' }, description: 'Até 3 ids.' } }
      }
    }
  }
];

function buildSystemPrompt(context) {
  const lines = [SYSTEM_PROMPT];
  if (context && typeof context === 'object') {
    if (Array.isArray(context.cidades) && context.cidades.length) {
      lines.push(`\nCidades do catálogo: ${context.cidades.slice(0, 30).join('; ')}.`);
    }
    if (context.bairrosPorCidade && typeof context.bairrosPorCidade === 'object') {
      const parts = Object.entries(context.bairrosPorCidade)
        .slice(0, 30)
        .map(([city, list]) => `${city}: ${(Array.isArray(list) ? list : []).slice(0, 60).join(', ')}`);
      lines.push(`Bairros por cidade:\n${parts.join('\n')}`);
    }
    if (Array.isArray(context.comodidades) && context.comodidades.length) {
      lines.push(`Comodidades cadastradas (só estas podem ser filtradas): ${context.comodidades.slice(0, 30).join(', ')}.`);
    }
  }
  return lines.join('\n');
}

// Aceita só os papéis e campos que o fluxo usa, com limites de tamanho.
function sanitizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return null;
  const out = [];
  for (const m of messages) {
    if (!m || typeof m !== 'object') return null;
    const content = m.content == null ? null : String(m.content).slice(0, MAX_CONTENT_CHARS);
    if (m.role === 'user') {
      if (!content) return null;
      out.push({ role: 'user', content });
    } else if (m.role === 'assistant') {
      const msg = { role: 'assistant', content };
      if (Array.isArray(m.tool_calls) && m.tool_calls.length) {
        msg.tool_calls = m.tool_calls.slice(0, 5).map(tc => ({
          id: String(tc.id),
          type: 'function',
          function: { name: String(tc.function?.name), arguments: String(tc.function?.arguments ?? '{}').slice(0, MAX_CONTENT_CHARS) }
        }));
      }
      out.push(msg);
    } else if (m.role === 'tool') {
      out.push({ role: 'tool', tool_call_id: String(m.tool_call_id), content: content ?? '' });
    } else {
      return null; // "system" e outros papéis não são aceitos do navegador
    }
  }
  return out;
}

/**
 * Trata POST /api/concierge de forma independente do servidor.
 * body: { messages: ChatMessage[], context?: { cidades, bairrosPorCidade, comodidades } }
 * @returns {{ status: number, headers: object, body: string }}
 */
export async function handleConciergeRequest({ method, body, origin, host }, keys = {}) {
  const json = (status, payload) => ({
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(payload)
  });

  if (method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (origin && host && new URL(origin).host !== host) return json(403, { error: 'forbidden' });
  if (!keys.openai) return json(503, { error: 'brain_unconfigured' });

  const messages = sanitizeMessages(body?.messages);
  if (!messages) return json(400, { error: 'invalid_messages' });

  const payload = {
    messages: [{ role: 'system', content: buildSystemPrompt(body?.context) }, ...messages],
    tools: TOOLS,
    parallel_tool_calls: false
  };

  const call = (model) => fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${keys.openai}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      model,
      // reasoning_effort só existe nos modelos de raciocínio (gpt-5 em diante)
      ...(REASONING_EFFORT && /^(gpt-[5-9]|o\d)/.test(model) ? { reasoning_effort: REASONING_EFFORT } : {})
    })
  });

  const now = Date.now();
  const models = MODELS.filter(m => !(exhaustedUntil.get(m) > now));
  for (const model of models.length ? models : MODELS) {
    try {
      let res = await call(model);
      let data = await res.json();
      if (res.status === 429) {
        const message = data?.error?.message || '';
        const wait = Number(/try again in ([\d.]+)s/i.exec(message)?.[1]);
        if (wait > 0 && wait <= 8) {
          // Limite por minuto com espera curta: tenta o mesmo modelo mais uma vez
          await new Promise(r => setTimeout(r, wait * 1000 + 250));
          res = await call(model);
          data = await res.json();
        } else {
          // Cota esgotada (ex.: por dia): deixa este modelo de lado por um tempo
          exhaustedUntil.set(model, now + Math.min((wait || 600) * 1000, 60 * 60 * 1000));
        }
      }
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${data?.error?.message?.slice(0, 160)}`);
      const msg = data.choices?.[0]?.message;
      if (!msg) throw new Error('resposta sem mensagem');
      return json(200, {
        message: {
          role: 'assistant',
          content: msg.content ?? null,
          ...(msg.tool_calls?.length ? { tool_calls: msg.tool_calls } : {})
        }
      });
    } catch (err) {
      console.error(`[concierge] falha no cérebro (${model}):`, err?.message || err);
    }
  }
  return json(502, { error: 'brain_failed' });
}
