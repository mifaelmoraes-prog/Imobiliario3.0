/**
 * conciergeSpeech.js
 * Voz de saída do Concierge em pt-BR: voz neural Gemini (via /api/tts) com
 * fallback para a voz do navegador (speechSynthesis).
 */

export const isSpeechSynthesisSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

// Prefere vozes pt-BR de melhor qualidade quando o sistema as oferece.
const PREFERRED_VOICES = [/google/i, /natural|neural|premium|enhanced|aprimorad/i, /luciana/i, /francisca|thalita|maria/i];

export function pickVoice() {
  if (!isSpeechSynthesisSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  const ptBR = voices.filter(v => /^pt[-_]br/i.test(v.lang));
  const pool = ptBR.length ? ptBR : voices.filter(v => /^pt/i.test(v.lang));
  for (const re of PREFERRED_VOICES) {
    const match = pool.find(v => re.test(v.name));
    if (match) return match;
  }
  return pool[0] || null;
}

// A lista de vozes carrega de forma assíncrona no Chrome; pede cedo para aquecer.
if (isSpeechSynthesisSupported()) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => window.speechSynthesis.getVoices());
}

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
let watchdog = null;
let currentAudio = null;
let currentFetch = null;

function clearWatchdog() {
  if (watchdog) clearInterval(watchdog);
  watchdog = null;
}

function stopAll() {
  clearWatchdog();
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
// Voz neural (Gemini TTS via /api/tts). Sem chave configurada, o servidor
// responde 503 e o Concierge passa a usar só a voz do navegador.
// ---------------------------------------------------------------------------
const NEURAL_ENDPOINT = '/api/tts';
// O Gemini leva 3,5 a 5,5 s por trecho; abaixo disso a voz cairia na do navegador
const NEURAL_TIMEOUT_MS = 9000;
let neuralAvailable = import.meta.env?.VITE_NEURAL_TTS !== 'off';
const audioCache = new Map(); // texto falado → object URL
const AUDIO_CACHE_LIMIT = 30;

export const isNeuralVoiceAvailable = () => neuralAvailable;

// Uma conversa fala com uma voz só: o provedor da primeira fala fica fixo, e o servidor
// não troca de voz no meio. Sem cota ou com erro, a voz neural fica em pausa e a
// conversa segue na voz do navegador, sem esperar cada resposta falhar de novo.
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

// Voz do navegador, em frases curtas (evita o corte de falas longas do Chrome).
function speakWithBrowser(spoken, token, { onStart, onEnd }) {
  if (!isSpeechSynthesisSupported()) {
    if (token === currentToken) {
      currentToken++;
      onEnd?.();
    }
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  synth.resume(); // destrava o Chrome quando ficou pausado

  const chunks = splitSentences(spoken);
  let started = false;
  const finish = () => {
    if (token !== currentToken) return;
    currentToken++;
    clearWatchdog();
    onEnd?.();
  };
  if (chunks.length === 0) return finish();

  const voice = pickVoice();
  chunks.forEach((chunk, i) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = voice?.lang || 'pt-BR';
    if (voice) utterance.voice = voice;
    utterance.rate = 1.05;
    utterance.onstart = () => {
      if (token === currentToken && !started) {
        started = true;
        onStart?.();
      }
    };
    if (i === chunks.length - 1) utterance.onend = finish;
    utterance.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') finish();
    };
    synth.speak(utterance);
  });

  // Rede de segurança: alguns navegadores não disparam onend.
  const startedAt = Date.now();
  watchdog = setInterval(() => {
    if (token !== currentToken) return clearWatchdog();
    if (Date.now() - startedAt > 1500 && !synth.speaking && !synth.pending) finish();
  }, 500);
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

  // Se a voz neural falhar no meio, o restante sai na voz do navegador
  const fallbackFrom = (i) => {
    if (token !== currentToken) return;
    currentAudio = null;
    if (!started) {
      started = true;
      onStart?.();
    }
    speakWithBrowser(chunks.slice(i).join(' '), token, { onEnd });
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
 * Fala o texto em pt-BR: voz neural (Gemini) quando disponível, senão a do
 * navegador. onEnd é chamado uma única vez quando a fala termina (ou falha);
 * não é chamado se stopSpeaking() ou outro speak() interromper.
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
    else speakWithBrowser(spoken, token, { onStart, onEnd });
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

/** Alguma forma de fala disponível (neural ou do navegador). */
export const canSpeak = () => neuralAvailable || isSpeechSynthesisSupported();
