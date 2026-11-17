// GET /api/regiao → { ativo, pais, uf }
// Devolve a região do visitante, lida dos cabeçalhos que a Vercel acrescenta na borda. Não usa IP
// nem guarda nada: o navegador é quem grava (tabela concierge_acessos). Desligado por padrão:
// só responde com a região quando TRACK_ACCESS_REGION=on.

const BASE_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

function lerCodigo(valor, formato) {
  const texto = String(Array.isArray(valor) ? valor[0] : valor ?? '').trim().toUpperCase();
  return formato.test(texto) ? texto : null;
}

export function handleRegiaoRequest({ method, headers = {} } = {}, env = process.env) {
  if (method !== 'GET') {
    return { status: 405, headers: { ...BASE_HEADERS, Allow: 'GET' }, body: JSON.stringify({ error: 'metodo_nao_permitido' }) };
  }
  if (env.TRACK_ACCESS_REGION !== 'on') {
    return { status: 200, headers: BASE_HEADERS, body: JSON.stringify({ ativo: false }) };
  }
  const pais = lerCodigo(headers['x-vercel-ip-country'], /^[A-Z]{2}$/);
  // A UF só vale para o Brasil: em outros países o código da região tem outro formato.
  const uf = pais === 'BR' ? lerCodigo(headers['x-vercel-ip-country-region'], /^[A-Z]{2}$/) : null;
  return { status: 200, headers: BASE_HEADERS, body: JSON.stringify({ ativo: true, pais, uf }) };
}
