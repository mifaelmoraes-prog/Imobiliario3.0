// Função serverless da Vercel: POST /api/concierge { messages, context } → { message }
import { handleConciergeRequest } from '../server/conciergeBrain.js';

export default async function handler(req, res) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  const result = await handleConciergeRequest(
    { method: req.method, body, origin: req.headers.origin, host: req.headers.host },
    { openai: process.env.OPENAI_API_KEY }
  );
  res.status(result.status);
  Object.entries(result.headers).forEach(([k, v]) => res.setHeader(k, v));
  res.send(result.body);
}
