/**
 * openaiTts.js
 * Voz neural do Concierge via OpenAI (gpt-4o-mini-tts). Roda só no servidor:
 * a chave OPENAI_API_KEY nunca vai para o navegador.
 */
const MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
const VOICE = process.env.OPENAI_TTS_VOICE || 'coral';
const INSTRUCTIONS =
  'Fale em português do Brasil, com sotaque brasileiro. Tom acolhedor, natural e profissional, ' +
  'em ritmo de conversa, como um corretor de imóveis atencioso.';

export async function synthesizeOpenAI(text, apiKey) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, voice: VOICE, input: text, instructions: INSTRUCTIONS, response_format: 'mp3' })
  });
  if (!res.ok) throw new Error(`OpenAI TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return { audio: Buffer.from(await res.arrayBuffer()), contentType: 'audio/mpeg' };
}
