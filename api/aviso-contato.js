// Função serverless da Vercel: POST /api/aviso-contato { nome, telefone, ... } → { enviado }
import { handleAvisoContatoRequest } from '../server/avisoContato.js';

export default async function handler(req, res) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  const result = await handleAvisoContatoRequest(
    { method: req.method, body, origin: req.headers.origin, host: req.headers.host, headers: req.headers },
    process.env
  );
  res.status(result.status);
  Object.entries(result.headers).forEach(([k, v]) => res.setHeader(k, v));
  res.send(result.body);
}
