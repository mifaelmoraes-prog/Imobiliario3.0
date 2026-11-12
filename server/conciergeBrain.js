/**
 * conciergeBrain.js
 * Cérebro conversacional do Concierge (OpenAI Chat Completions com ferramentas).
 * O servidor só guarda o prompt e as definições das ferramentas; quem executa as
 * ferramentas é o navegador, que tem o catálogo e o motor de match. Assim o
 * modelo só fala de imóveis que o catálogo devolveu.
 * Usado por api/concierge.js (Vercel) e pela rota de desenvolvimento em vite.config.js.
 */
import { parseRetryAfterSec } from './openaiTts.js';

// Modelo principal e reservas: cada modelo tem a própria cota na OpenAI, então
// se um bater o limite o próximo da lista assume.
const MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-5.4-mini';
// Não use gpt-4o-mini aqui: a voz gpt-4o-mini-tts divide a cota dele.
// O gpt-5.4-nano é o último: nos testes ele ignorou regras do prompt e confundiu "5 mil" com 5 milhões.
const FALLBACK_MODELS = (process.env.OPENAI_CHAT_FALLBACK_MODELS ?? 'gpt-4.1-mini,gpt-5.4,gpt-4.1,gpt-5.4-nano')
  .split(',').map(s => s.trim()).filter(Boolean);
const MODELS = [...new Set([MODEL, ...FALLBACK_MODELS])];
const exhaustedUntil = new Map(); // modelo → timestamp até quando pular
const REASONING_EFFORT = process.env.OPENAI_CHAT_REASONING ?? 'none';

// reasoning_effort só existe nos modelos de raciocínio; "none" só a partir do gpt-5.1
function reasoningFor(model) {
  if (!REASONING_EFFORT || !/^(gpt-[5-9]|o\d)/.test(model)) return null;
  if (REASONING_EFFORT === 'none' && /^gpt-5(-|$)/.test(model)) return 'minimal';
  return REASONING_EFFORT;
}
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
- Suas respostas são faladas em voz alta: no máximo 2 frases curtas, uns 35 palavras, em tom de conversa. Sem listas, markdown, emojis, parênteses nem aspas.
- Termine com uma única pergunta curta, nunca duas, que avance para o próximo marco que ainda falta (por exemplo, depois de mostrar um imóvel, pergunte se é para morar ou investir). Evite fechos vagos como "se quiser, posso ajudar" e "posso ajudar em mais alguma coisa?".
- Varie o começo das frases: não comece todas as respostas com "Perfeito", "Claro" ou "Entendi". Reconheça o que a pessoa disse com naturalidade e vá direto ao ponto.
- Se a pessoa não respondeu à sua última pergunta, não a repita: avance com a busca ou faça outra pergunta. Nunca faça a mesma pergunta duas vezes seguidas.
- Ao sugerir bairros, cite no máximo 2. Nunca leia uma lista.
- Valores: "mil" multiplica por 1.000 e "milhão" por 1.000.000. "5 mil" são R$ 5.000, nunca R$ 5.000.000. Um orçamento de compra abaixo de R$ 100.000 quase certamente é aluguel ou engano: confirme com a pessoa antes de buscar.

Exemplos do tom e do tamanho certos (adapte, não copie):
- "procuro casa em Jurerê" → "Em Jurerê tenho duas casas, uma bem mais em conta que a outra. É para morar ou investir?"
- "quero ver" → (mostrar_imoveis) "Deixei na tela para você. Quantos quartos você precisa?"
- "até 1 milhão" → "Nesse valor achei um apartamento de 2 quartos na Praia do Canto. Quer que eu mostre?"
- Escreva valores sempre em algarismos com "R$", nunca por extenso. Para preços de imóveis, copie exatamente o campo preco_texto devolvido pela ferramenta (por exemplo "R$ 8.199.000"); não arredonde nem converta.
- Nunca invente imóveis, preços, bairros ou características. Só fale de imóveis que vieram da ferramenta buscar_imoveis nesta conversa.
- Sempre que a pessoa der ou mudar um critério (cidade, bairro, tipo, quartos, orçamento, comodidade), chame buscar_imoveis com TODOS os critérios atuais da conversa, não só o novo.
- Quando houver um só resultado, diga o essencial numa frase (tipo, bairro e preço). Com 2 ou 3, resuma o contraste entre eles (por exemplo, "uma casa maior e uma mais em conta"), sem ler a ficha de cada um.
- Quando a pessoa pedir para ver, quiser o link, os detalhes ou fotos, chame mostrar_imoveis com os ids. Depois de mostrar, não leia nem repita o que já está nos cartões (preço, metragem, quartos) e não descreva a tela: diga só algo curto, como "Deixei na tela para você". Nunca diga "botão", "cartão" ou "clique".
- Se nada atender, diga o que mais limita (por exemplo o orçamento) e sugira flexibilizar um critério.
- Se a mensagem parecer cortada ou incompleta (por exemplo "eu quero"), peça com naturalidade para a pessoa continuar. Nunca deduza uma resposta que a pessoa não deu: "eu quero" não responde se é para morar ou investir.
- Se a pessoa pedir algo que o catálogo não tem (por exemplo uma comodidade não cadastrada), diga com honestidade.
- O catálogo tem apenas imóveis à venda. Se a pessoa falar em aluguel, diga com gentileza que no momento trabalhamos só com venda, não use o valor do aluguel como orçamento de compra e pergunte se ela tem interesse em comprar; se não tiver, ofereça que um corretor a ajude.
- Respostas curtas ou soltas ("não", "dessa vez", "sim") devem ser lidas no contexto da sua última pergunta. Se não fizerem sentido, peça para a pessoa repetir, sem listar campos.

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
// Uma linha por chamada ao modelo, para medir o custo real (sem conteúdo da conversa).
// Desligue com CONCIERGE_LOG_USAGE=0.
function logUsage(model, usage, msg) {
  if (process.env.CONCIERGE_LOG_USAGE === '0' || !usage) return;
  console.log('[concierge-usage]', JSON.stringify({
    model,
    input_tokens: usage.prompt_tokens ?? null,
    cached_tokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
    output_tokens: usage.completion_tokens ?? null,
    reasoning_tokens: usage.completion_tokens_details?.reasoning_tokens ?? 0,
    tool_call: Boolean(msg.tool_calls?.length)
  }));
}

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
      ...(reasoningFor(model) ? { reasoning_effort: reasoningFor(model) } : {})
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
        const wait = parseRetryAfterSec(message);
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
      logUsage(model, data.usage, msg);
      return json(200, {
        model, // qual modelo respondeu (útil para entender mudanças de qualidade)
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
