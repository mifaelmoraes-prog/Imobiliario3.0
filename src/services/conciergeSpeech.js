/**
 * conciergeSpeech.js
 * Voz de saída do Concierge (Web Speech API, speechSynthesis) em pt-BR.
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
    .replace(/R\$\s*([\d.]+)(?:,\d{2})?/g, (_, n) => spokenMoney(parseInt(n.replace(/\./g, ''), 10)))
    .replace(/\b24h\b/gi, '24 horas')
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

function clearWatchdog() {
  if (watchdog) clearInterval(watchdog);
  watchdog = null;
}

/**
 * Fala o texto em pt-BR. onEnd é chamado uma única vez quando a fala termina
 * (ou falha); não é chamado se stopSpeaking() ou outro speak() interromper.
 */
export function speak(text, { onStart, onEnd } = {}) {
  if (!isSpeechSynthesisSupported()) {
    onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  const token = ++currentToken;
  clearWatchdog();
  synth.cancel();
  synth.resume(); // destrava o Chrome quando ficou pausado

  const chunks = splitSentences(toSpokenText(text));
  if (chunks.length === 0) {
    onEnd?.();
    return;
  }

  let started = false;
  const finish = () => {
    if (token !== currentToken) return;
    currentToken++;
    clearWatchdog();
    onEnd?.();
  };

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
  // Espera 1,5 s antes de checar, para a fala ter tempo de começar.
  const startedAt = Date.now();
  watchdog = setInterval(() => {
    if (token !== currentToken) return clearWatchdog();
    if (Date.now() - startedAt > 1500 && !synth.speaking && !synth.pending) finish();
  }, 500);
}

export function stopSpeaking() {
  currentToken++;
  clearWatchdog();
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel();
}
