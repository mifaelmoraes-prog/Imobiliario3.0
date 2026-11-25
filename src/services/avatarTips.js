/**
 * avatarTips.js
 * Frase do balão do avatar de atendimento, montada com o que o visitante já fez no site
 * (filtros, imóveis vistos, favoritos, busca). Roda só no navegador e não chama a IA.
 * Cada dica tem uma chave: o avatar não repete a mesma dica na mesma visita.
 */

const PLURAL = { Casa: 'casas', Apartamento: 'apartamentos', Cobertura: 'coberturas' };
const DO_TIPO = { casa: 'da casa', apartamento: 'do apartamento', cobertura: 'da cobertura' };

const reais = (v) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;

/**
 * @param {object|null} visitor resultado de buildVisitorContext (null = ainda não fez nada)
 * @returns {{ chave: string, texto: string }}
 */
export function buildAvatarTip(visitor) {
  const dica = montarDica(visitor);
  // Sem nome, a frase começa minúscula ("procurando…"): sobe a primeira letra
  return { ...dica, texto: dica.texto.charAt(0).toUpperCase() + dica.texto.slice(1) };
}

function montarDica(visitor) {
  const v = visitor || {};
  const primeiro = v.nome ? `${String(v.nome).split(' ')[0]}, ` : '';

  const favoritos = v.favoritos || [];
  if (favoritos.length >= 2) {
    return {
      chave: `favoritos-${favoritos.length}`,
      texto: `${primeiro}você salvou ${favoritos.length} imóveis. Quer que eu compare os ${favoritos.length} ou chame um corretor para te mandar detalhes?`
    };
  }

  const visto = (v.imoveis_vistos || [])[0];
  if (visto?.id && visto?.bairro) {
    const tipo = String(visto.tipo || '').toLowerCase();
    return {
      chave: `visto-${visto.id}`,
      texto: `${primeiro}gostou ${DO_TIPO[tipo] || 'do imóvel'} em ${visto.bairro}? Posso achar outros parecidos ou tirar suas dúvidas sobre ele.`
    };
  }

  const c = v.criterios || {};
  const onde = c.bairros?.[0] || c.cidade || null;
  if (c.tipo || onde || c.orcamento_max) {
    const oQue = PLURAL[c.tipo] || 'imóveis';
    const ate = c.orcamento_max ? ` até ${reais(c.orcamento_max)}` : '';
    const pergunta = c.quartos_min ? 'Quer que eu separe os melhores para você?' : 'Me diga quantos quartos e eu separo os melhores.';
    return {
      chave: `criterios-${c.tipo || ''}-${onde || ''}-${c.orcamento_max || ''}-${c.quartos_min || ''}`,
      texto: `${primeiro}procurando ${oQue}${onde ? ` em ${onde}` : ''}${ate}? ${pergunta}`
    };
  }

  if (v.busca_texto) {
    return {
      chave: `busca-${v.busca_texto}`,
      texto: `${primeiro}buscando por ${v.busca_texto}? Posso refinar essa busca com você, é só falar ou digitar.`
    };
  }

  return { chave: 'ola', texto: 'Olá! Posso te ajudar a achar o imóvel certo. É só falar ou digitar.' };
}
