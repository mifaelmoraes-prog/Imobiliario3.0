// GET /api/regiao → { ativo, pais, uf }
// Devolve a região do visitante, lida dos cabeçalhos que a Vercel acrescenta na borda. Não usa IP
// nem guarda nada. O navegador usa a UF para abrir o portal no estado do visitante e, só quando
// TRACK_ACCESS_REGION=on (ativo: true), grava a estatística de acessos (tabela concierge_acessos).

const BASE_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

function lerCodigo(valor, formato) {
  const texto = String(Array.isArray(valor) ? valor[0] : valor ?? '').trim().toUpperCase();
  return formato.test(texto) ? texto : null;
}

export function handleRegiaoRequest({ method, headers = {} } = {}, env = process.env) {
  if (method !== 'GET') {
    return { status: 405, headers: { ...BASE_HEADERS, Allow: 'GET' }, body: JSON.stringify({ error: 'metodo_nao_permitido' }) };
  }
  // `ativo` diz se o navegador deve gravar o acesso (estatística). País e UF voltam sempre: o portal
  // usa a UF só na tela, para abrir já no estado do visitante, e não guarda nada com isso.
  const ativo = env.TRACK_ACCESS_REGION === 'on';
  const pais = lerCodigo(headers['x-vercel-ip-country'], /^[A-Z]{2}$/);
  // A UF só vale para o Brasil: em outros países o código da região tem outro formato.
  const uf = pais === 'BR' ? lerCodigo(headers['x-vercel-ip-country-region'], /^[A-Z]{2}$/) : null;
  return { status: 200, headers: BASE_HEADERS, body: JSON.stringify({ ativo, pais, uf }) };
}
