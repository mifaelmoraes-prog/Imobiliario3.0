// Função serverless da Vercel: GET /api/regiao → { ativo, pais, uf }
import { handleRegiaoRequest } from '../server/regiao.js';

export default function handler(req, res) {
  const result = handleRegiaoRequest({ method: req.method, headers: req.headers }, process.env);
  res.status(result.status);
  Object.entries(result.headers).forEach(([k, v]) => res.setHeader(k, v));
  res.send(result.body);
}
