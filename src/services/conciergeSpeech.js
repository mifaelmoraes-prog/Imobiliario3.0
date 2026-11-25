/**
 * conciergeSpeech.js
 * Voz de saída do atendimento em pt-BR: sempre a mesma voz neural (OpenAI, via /api/tts).
 * Não há reserva na voz do navegador: ela muda de computador para computador (pode ser
 * feminina, robótica…) e trocaria a voz no meio da conversa. Sem a voz neural, responde só
 * por texto.
 */

export const isSpeechSynthesisSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

/** "a", "a e b", "a, b e c" */
export function joinPt(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

/** 900000 → "900 mil reais"; 1200000 → "1 milhão e 200 mil reais". */
export function spokenMoney(value) {
  const millions = Math.floor(value / 1_000_000);
  const thousands = Math.round((value % 1_000_000) / 1_000);
  const parts = [];
  if (millions > 0) parts.push(`${millions} ${millions === 1 ? 'milhão' : 'milhões'}`);
  if (thousands > 0) parts.push(`${thousands} mil`);
  if (parts.length === 0) return `${value} reais`;
  // "2 milhões de reais", mas "1 milhão e 200 mil reais"
  return thousands === 0 ? `${parts[0]} de reais` : `${joinPt(parts)} reais`;
}

/** Ajusta o texto escrito para soar natural em voz. */
export function toSpokenText(text) {
  return (text || '')
    // "R$ 650 mil" → "650 mil reais"; "R$ 3,8 milhões" → "3,8 milhões de reais"
    .replace(/R\$\s*([\d.,]+)\s*(mil|milh(?:ão|ao|ões|oes))(?![a-zà-ú])/gi, (_, n, unit) =>
      /^mil$/i.test(unit) ? `${n} mil reais` : `${n} ${unit} de reais`)
    .replace(/R\$\s*(\d[\d.]*\d|\d)(?:,\d{2})?/g, (_, n) => spokenMoney(parseInt(n.replace(/\./g, ''), 10)))
    .replace(/\b24h\b/gi, '24 horas')
    .replace(/\s*\([^)]*\)/g, '') // apartes entre parênteses só fazem sentido na tela
    .replace(/\s-\s[A-Z]{2}\b/g, '') // "Vitória - ES" → "Vitória"
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Frases curtas evitam o corte de falas longas no Chrome (~15 s).
function splitSentences(text) {
  return (text.match(/[^.!?]+[.!?]*/g) || []).map(s => s.trim()).filter(Boolean);
}

let currentToken = 0;
let currentAudio = null;
let currentFetch = null;

function stopAll() {
  currentFetch?.abort();
  currentFetch = null;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel();
}

// ---------------------------------------------------------------------------
// Voz neural (OpenAI, via /api/tts). Sem chave configurada, o servidor
// responde 503 e o atendimento passa a responder só por texto.
// ---------------------------------------------------------------------------
const NEURAL_ENDPOINT = '/api/tts';
// Tempo máximo por trecho de áudio; passou disso, a resposta fica só no texto
const NEURAL_TIMEOUT_MS = 9000;
let neuralAvailable = import.meta.env?.VITE_NEURAL_TTS !== 'off';
const audioCache = new Map(); // texto falado → object URL
const AUDIO_CACHE_LIMIT = 30;

export const isNeuralVoiceAvailable = () => neuralAvailable;

// Uma conversa fala com uma voz só: o provedor da primeira fala fica fixo, e o servidor
// não troca de voz no meio. Sem cota ou com erro, a voz neural fica em pausa e a
// conversa segue só no texto, sem esperar cada resposta falhar de novo.
let sessionProvider = null;
let neuralDownUntil = 0;
const markNeuralDown = (seconds) => {
  neuralDownUntil = Date.now() + Math.min(Math.max(seconds, 30), 30 * 60) * 1000;
};
const isNeuralUsable = () => neuralAvailable && Date.now() >= neuralDownUntil;

async function fetchNeuralAudio(text, signal) {
  if (audioCache.has(text)) return audioCache.get(text);
  const res = await fetch(NEURAL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, ...(sessionProvider ? { provider: sessionProvider } : {}) }),
    signal
  });
  if (res.status === 503 || res.status === 404 || res.status === 405) {
    neuralAvailable = false; // sem chave ou sem função: não tenta de novo nesta sessão
    throw new Error(`voz neural indisponível (${res.status})`);
  }
  if (res.status === 429) {
    let wait = 300;
    try {
      wait = (await res.json()).retry_after_sec || wait;
    } catch {
      // usa a espera padrão
    }
    markNeuralDown(wait);
    throw new Error('cota da voz neural esgotada');
  }
  if (!res.ok || !(res.headers.get('Content-Type') || '').startsWith('audio/')) {
    markNeuralDown(120);
    throw new Error(`falha na voz neural (${res.status})`);
  }
  const provider = res.headers.get('X-TTS-Provider');
  if (provider && !sessionProvider) sessionProvider = provider;
  const url = URL.createObjectURL(await res.blob());
  if (audioCache.size >= AUDIO_CACHE_LIMIT) {
    const [oldText, oldUrl] = audioCache.entries().next().value;
    URL.revokeObjectURL(oldUrl);
    audioCache.delete(oldText);
  }
  audioCache.set(text, url);
  return url;
}

// Sem a voz neural: não fala com outra voz; encerra e a resposta fica só no texto.
function finishSilently(token, { onEnd }) {
  if (token !== currentToken) return;
  currentToken++;
  onEnd?.();
}

// Cada trecho é uma requisição de voz, e a cota é pequena: respostas curtas (as normais)
// saem numa só, com a mesma entonação do começo ao fim. Só as longas são divididas, em
// no máximo 2 trechos, para a primeira parte tocar enquanto a segunda é gerada.
function neuralChunks(text) {
  const MAX_SINGLE = 300;
  const MAX_CHUNK = 500;
  if (text.length <= MAX_SINGLE) return [text];
  const out = [];
  let buf = '';
  for (const s of splitSentences(text)) {
    if (!out.length && buf.length >= 90) {
      out.push(buf);
      buf = s;
    } else if (buf && buf.length + s.length + 1 > MAX_CHUNK) {
      out.push(buf);
      buf = s;
    } else {
      buf = buf ? `${buf} ${s}` : s;
    }
  }
  if (buf) out.push(buf);
  return out;
}

function fetchWithTimeout(text) {
  const controller = new AbortController();
  currentFetch = controller;
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, NEURAL_TIMEOUT_MS);
  return fetchNeuralAudio(text, controller.signal)
    .catch((err) => {
      if (timedOut) markNeuralDown(60); // demorou demais: não tenta a cada resposta
      throw err;
    })
    .finally(() => clearTimeout(timeout));
}

function speakWithNeural(spoken, token, callbacks) {
  const { onStart, onEnd } = callbacks;
  const chunks = neuralChunks(spoken);
  let started = false;
  let next = fetchWithTimeout(chunks[0]);

  // Se a voz neural falhar no meio, o restante fica só no texto (nunca em outra voz)
  const fallbackFrom = () => {
    if (token !== currentToken) return;
    currentAudio = null;
    if (!started) {
      started = true;
      onStart?.();
    }
    finishSilently(token, { onEnd });
  };

  const playAt = (i) => {
    next
      .then((url) => {
        if (token !== currentToken) return;
        currentFetch = null;
        // Já pede o próximo trecho enquanto este toca
        if (i + 1 < chunks.length) {
          next = fetchWithTimeout(chunks[i + 1]);
          next.catch(() => {}); // tratado quando chegar a vez dele
        }
        const audio = new Audio(url);
        currentAudio = audio;
        let playing = false;
        audio.onplaying = () => {
          playing = true;
          if (token === currentToken && !started) {
            started = true;
            onStart?.();
          }
        };
        audio.onended = () => {
          if (token !== currentToken) return;
          if (i + 1 < chunks.length) return playAt(i + 1);
          currentToken++;
          currentAudio = null;
          onEnd?.();
        };
        audio.onerror = () => {
          if (!playing) fallbackFrom(i);
        };
        audio.play().catch(() => {
          if (!playing) fallbackFrom(i);
        });
      })
      .catch(() => fallbackFrom(i));
  };

  playAt(0);
}

/**
 * Fala o texto em pt-BR sempre com a voz do atendimento (neural). Sem ela, não fala:
 * a resposta fica só no texto. onEnd é chamado uma única vez quando a fala termina (ou
 * falha); não é chamado se stopSpeaking() ou outro speak() interromper.
 */
export function speak(text, { onStart, onEnd, audioUrl } = {}) {
  const token = ++currentToken;
  stopAll();
  const spoken = toSpokenText(text);
  if (!spoken) {
    currentToken++;
    onEnd?.();
    return;
  }
  const speakText = () => {
    if (token !== currentToken) return;
    if (isNeuralUsable()) speakWithNeural(spoken, token, { onStart, onEnd });
    else finishSilently(token, { onEnd });
  };
  if (!audioUrl) return speakText();

  // Áudio pronto (ex.: saudação gravada): toca na hora; se falhar, fala o texto
  const audio = new Audio(audioUrl);
  currentAudio = audio;
  let playing = false;
  audio.onplaying = () => {
    if (token !== currentToken || playing) return;
    playing = true;
    onStart?.();
  };
  audio.onended = () => {
    if (token !== currentToken) return;
    currentToken++;
    currentAudio = null;
    onEnd?.();
  };
  audio.onerror = () => {
    if (!playing) speakText();
  };
  audio.play().catch(() => {
    if (!playing) speakText();
  });
}

export function stopSpeaking() {
  currentToken++;
  stopAll();
}

/** A voz do atendimento está disponível (só a neural; não há voz de reserva). */
export const canSpeak = () => neuralAvailable;
