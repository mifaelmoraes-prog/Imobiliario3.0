/**
 * openaiTts.js
 * Voz neural do Concierge via OpenAI (gpt-4o-mini-tts). Roda só no servidor:
 * a chave OPENAI_API_KEY nunca vai para o navegador.
 */
const MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
const VOICE = process.env.OPENAI_TTS_VOICE || 'marin'; // a preferida da equipe entre as da OpenAI
const INSTRUCTIONS =
  'Fale em português do Brasil, com sotaque brasileiro. Tom acolhedor, natural e profissional, ' +
  'em ritmo de conversa, como um corretor de imóveis atencioso.';

/** "Please try again in 28m48s" / "6s" / "1.2s" / "2h3m" → segundos (ou null). */
export function parseRetryAfterSec(message) {
  const m = /try again in ((?:\d+h)?(?:\d+m(?!s))?(?:[\d.]+s)?)/i.exec(message || '');
  if (!m || !m[1]) return null;
  const h = Number(/(\d+)h/.exec(m[1])?.[1] || 0);
  const min = Number(/(\d+)m(?!s)/.exec(m[1])?.[1] || 0);
  const s = Number(/([\d.]+)s/.exec(m[1])?.[1] || 0);
  const total = h * 3600 + min * 60 + s;
  return total > 0 ? total : null;
}

export async function synthesizeOpenAI(text, apiKey) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, voice: VOICE, input: text, instructions: INSTRUCTIONS, response_format: 'mp3' })
  });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`OpenAI TTS ${res.status}: ${body.slice(0, 200)}`);
    err.status = res.status;
    err.retryAfterSec = parseRetryAfterSec(body);
    throw err;
  }
  return { audio: Buffer.from(await res.arrayBuffer()), contentType: 'audio/mpeg' };
}
