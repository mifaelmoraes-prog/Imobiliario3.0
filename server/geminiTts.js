/**
 * geminiTts.js
 * Voz neural do Concierge via Gemini TTS. Roda só no servidor: a chave
 * GEMINI_API_KEY nunca vai para o navegador.
 * Usado por api/tts.js (Vercel) e pela rota de desenvolvimento em vite.config.js.
 */
import { GoogleGenAI } from '@google/genai';
import { synthesizeOpenAI } from './openaiTts.js';

const MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-lite-tts';
const VOICE = process.env.GEMINI_TTS_VOICE || 'Sulafat'; // "Warm"
const STYLE = 'acolhedor, natural e profissional, em ritmo de conversa';
export const MAX_CHARS = 600;

let client = null;
let clientKey = null;
function getClient(apiKey) {
  if (!client || clientKey !== apiKey) {
    client = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1beta' } });
    clientKey = apiKey;
  }
  return client;
}

// Frases que se repetem ("Deseja refinar algo mais?") ficam em memória
// enquanto a instância estiver quente.
const cache = new Map();
const CACHE_LIMIT = 100;

// O retorno unário já é WAV; se vier PCM cru (24 kHz, mono, 16 bits), embrulha.
function ensureWav(buf) {
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF') return buf;
  const header = Buffer.alloc(44);
  const sampleRate = 24000;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + buf.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(buf.length, 40);
  return Buffer.concat([header, buf]);
}

export async function synthesize(text, apiKey) {
  if (cache.has(text)) return cache.get(text);
  const interaction = await getClient(apiKey).interactions.create({
    model: MODEL,
    input: [{
      type: 'user_input',
      content: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style: STYLE }] }]
    }],
    response_format: { type: 'audio' },
    generation_config: { speech_config: [{ voice: VOICE }] }
  });
  const data = interaction?.output_audio?.data;
  if (!data) throw new Error('Gemini TTS não retornou áudio');
  const wav = ensureWav(Buffer.from(data, 'base64'));
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(text, wav);
  return wav;
}

/**
 * Escolhe o provedor: TTS_PROVIDER=gemini|openai; sem isso, usa o que tiver chave
 * (OpenAI primeiro: começa a falar em ~1,5 s, contra ~4,5 s do Gemini).
 */
function pickProvider(keys) {
  const wanted = (process.env.TTS_PROVIDER || '').toLowerCase();
  if (wanted === 'openai' && keys.openai) return 'openai';
  if (wanted === 'gemini' && keys.gemini) return 'gemini';
  if (keys.openai) return 'openai';
  if (keys.gemini) return 'gemini';
  return null;
}

// Provedor → timestamp até quando pular (cota esgotada)
const exhaustedUntil = new Map();
const isExhausted = (name) => (exhaustedUntil.get(name) || 0) > Date.now();

async function synthesizeWith(provider, text, keys) {
  if (provider === 'openai') {
    const cacheKey = `openai:${text}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    const result = await synthesizeOpenAI(text, keys.openai);
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
    cache.set(cacheKey, result);
    return result;
  }
  return { audio: await synthesize(text, keys.gemini), contentType: 'audio/wav' };
}

/**
 * Trata POST /api/tts de forma independente do servidor.
 * @param keys { gemini?: string, openai?: string }
 * @returns {{ status: number, headers: object, body: Buffer|string }}
 */
export async function handleTtsRequest({ method, body, origin, host }, keys = {}) {
  const json = (status, payload) => ({
    status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (method !== 'POST') return json(405, { error: 'method_not_allowed' });
  // Só aceita chamadas da própria página (evita uso da chave por outros sites)
  if (origin && host && new URL(origin).host !== host) return json(403, { error: 'forbidden' });
  const primary = pickProvider(keys);
  if (!primary) return json(503, { error: 'tts_unconfigured' });

  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text || text.length > MAX_CHARS) return json(400, { error: 'invalid_text' });

  // Uma conversa fala com uma voz só: depois da primeira fala, o navegador fixa o
  // provedor (body.provider) e o servidor não troca de provedor no meio dela.
  // Se o fixado estiver sem cota, o navegador passa para a voz do navegador.
  const pinned = ['openai', 'gemini'].includes(body?.provider) && keys[body.provider] ? body.provider : null;
  // Trocar de provedor sozinho trocaria a voz no meio do atendimento, e o Gemini leva de 11 a 20 s
  // por fala (medido): só vale como reserva se for pedido (TTS_ALLOW_PROVIDER_FALLBACK=1).
  const backup = primary === 'gemini' ? 'openai' : 'gemini';
  const allowFallback = process.env.TTS_ALLOW_PROVIDER_FALLBACK === '1' && keys[backup];
  const order = pinned ? [pinned] : allowFallback ? [primary, backup] : [primary];
  const available = order.filter(name => !isExhausted(name));
  const exhaustedReply = () => {
    const wait = Math.max(...order.map(name => Math.ceil(((exhaustedUntil.get(name) || 0) - Date.now()) / 1000)), 30);
    return json(429, { error: 'tts_exhausted', retry_after_sec: wait });
  };
  if (available.length === 0) return exhaustedReply();

  for (const name of available) {
    try {
      const { audio, contentType } = await synthesizeWith(name, text, keys);
      if (process.env.CONCIERGE_LOG_USAGE !== '0') {
        console.log('[tts-usage]', JSON.stringify({ provider: name, chars: text.length, audio_bytes: audio.length }));
      }
      return {
        status: 200,
        headers: { 'Content-Type': contentType, 'Cache-Control': 'private, max-age=86400', 'X-TTS-Provider': name },
        body: audio
      };
    } catch (err) {
      console.error(`[tts] falha no ${name} TTS:`, String(err?.message || err).slice(0, 160));
      // Cota esgotada: deixa o provedor de lado por um tempo, sem gastar uma tentativa por fala
      if (err?.status === 429 && !(err.retryAfterSec <= 8)) {
        exhaustedUntil.set(name, Date.now() + Math.min((err.retryAfterSec || 600) * 1000, 60 * 60 * 1000));
      }
    }
  }
  // Se a falha foi falta de cota, avisa o navegador para pausar a voz neural por um tempo
  return order.every(isExhausted) ? exhaustedReply() : json(502, { error: 'tts_failed' });
}
