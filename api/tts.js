// Função serverless da Vercel: POST /api/tts { text } → audio/wav (voz neural Gemini)
import { handleTtsRequest } from '../server/geminiTts.js';

export default async function handler(req, res) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  const result = await handleTtsRequest(
    { method: req.method, body, origin: req.headers.origin, host: req.headers.host },
    { gemini: process.env.GEMINI_API_KEY, openai: process.env.OPENAI_API_KEY }
  );
  res.status(result.status);
  Object.entries(result.headers).forEach(([k, v]) => res.setHeader(k, v));
  res.send(result.body);
}
