// Lado do navegador do cérebro do Concierge: busca no catálogo, contexto e saudação do visitante.
import test from 'node:test';
import assert from 'node:assert/strict';
import { searchCatalog, buildVisitorContext, buildGreeting } from './conciergeBrainClient.js';
import { buildVocabulary } from './conciergeParser.js';

const casa = (id, extra = {}) => ({
  id, type: 'Casa', city: 'Florianópolis - SC', neighborhood: 'Jurerê Internacional',
  price: 2_000_000, area: 200, bedrooms: 4, suites: 2, parking: 2, condoFee: 0, iptuMonthly: 0, amenities: ['Piscina'], ...extra
});
const CATALOGO = [
  casa('F1', { price: 3_000_000 }),
  casa('F2', { price: 1_000_000, bedrooms: 2 }),
  casa('F3', { price: 2_000_000, condoFee: 1_500, iptuMonthly: 250 }),
  casa('C1', { city: 'Curitiba - PR', neighborhood: 'Batel', type: 'Apartamento', price: 800_000, amenities: [] })
];
const vocabulary = buildVocabulary(CATALOGO);
const buscar = (args) => searchCatalog(args, { allProperties: CATALOGO, vocabulary });

// ---------------------------------------------------------------------------------------------
test('busca: filtra pelos critérios, ordena do mais caro ao mais barato e resume cada imóvel', () => {
  const { result } = buscar({ cidade: 'Florianópolis', tipo: 'Casa', quartos_min: 3 });
  assert.equal(result.total_compativeis, 2);
  assert.deepEqual(result.imoveis.map(i => i.id), ['F1', 'F3']);
  assert.deepEqual(result.criterios_aplicados, { cidade: 'Florianópolis - SC', bairros: [], tipo: 'Casa', quartos_min: 3, orcamento_max: null, comodidades: [] });
  assert.equal(result.imoveis[0].preco_texto, 'R$ 3.000.000');
  assert.equal(result.imoveis[0].preco_m2_texto, 'R$ 15.000 por m²');
  assert.equal('condominio_texto' in result.imoveis[0], false, 'condomínio 0 não é citado');
  assert.equal(result.imoveis[1].condominio_texto, 'R$ 1.500 por mês');
  assert.equal(result.imoveis[1].iptu_texto, 'R$ 250 por mês');
  assert.equal(result.avisos, undefined);
});

test('busca: o orçamento limita o preço', () => {
  const { result } = buscar({ cidade: 'Florianópolis', orcamento_max: 2_500_000 });
  assert.deepEqual(result.imoveis.map(i => i.id), ['F3', 'F2']);
  assert.equal(result.criterios_aplicados.orcamento_max, 2_500_000);
});

test('busca: lista no máximo 5 imóveis, mas informa o total', () => {
  const muitos = Array.from({ length: 8 }, (_, i) => casa(`M${i}`, { price: 1_000_000 + i }));
  const { result } = searchCatalog({ cidade: 'Florianópolis' }, { allProperties: muitos, vocabulary: buildVocabulary(muitos) });
  assert.equal(result.total_compativeis, 8);
  assert.equal(result.imoveis.length, 5);
});

test('busca: o bairro dito sozinho define a cidade', () => {
  const { criteria } = buscar({ bairros: ['Batel'] });
  assert.equal(criteria.city?.shortLabel, 'Curitiba');
  assert.deepEqual(criteria.neighborhoods, ['Batel']);
});

test('busca: comodidade fora do catálogo vira aviso, não filtro', () => {
  const { result } = buscar({ cidade: 'Florianópolis', comodidades: ['heliponto'] });
  assert.equal(result.avisos.length, 1);
  assert.match(result.avisos[0], /Comodidade "heliponto" não está cadastrada/);
  assert.equal(result.total_compativeis, 3, 'sem filtro válido de comodidade, a cidade continua valendo');
});

// Roteiro de região sem imóveis (pedido do Mifael): confirmar que não há, sem mostrar outro lugar
// como se atendesse, e manter o resto do que a pessoa já disse.
test('região: cidade fora do catálogo confirma que não há imóveis e não lista outra cidade', () => {
  const { result, criteria } = buscar({ cidade: 'Atlantis', tipo: 'Casa', quartos_min: 3, orcamento_max: 2_500_000 });
  assert.equal(result.regiao_sem_imoveis, true);
  assert.equal(result.regiao_pedida, 'Atlantis');
  assert.equal(result.total_compativeis, 0);
  assert.deepEqual(result.imoveis, [], 'nenhum imóvel de outra cidade como se atendesse');
  assert.equal(result.mais_proximos, undefined);
  assert.deepEqual(result.cidades_com_imoveis.map(c => c.cidade), ['Florianópolis - SC', 'Curitiba - PR']);
  assert.equal(result.cidades_com_imoveis[0].imoveis, 3);
  assert.match(result.orientacao, /Atlantis/);
  assert.match(result.orientacao, /registrar_interesse/);
  // o contexto da conversa segue nos critérios devolvidos
  assert.equal(result.criterios_aplicados.tipo, 'Casa');
  assert.equal(result.criterios_aplicados.quartos_min, 3);
  assert.equal(result.criterios_aplicados.orcamento_max, 2_500_000);
  assert.equal(criteria.foraDaRegiao, true, 'o navegador não deve apagar o filtro que a pessoa já tinha');
});

test('região: bairro fora do catálogo numa cidade que tem imóveis oferece os bairros que existem', () => {
  const { result, criteria } = buscar({ cidade: 'Florianópolis', bairros: ['Lugar Nenhum'], tipo: 'Casa' });
  assert.equal(result.regiao_sem_imoveis, true);
  assert.match(result.regiao_pedida, /Lugar Nenhum/);
  assert.match(result.regiao_pedida, /Florianópolis/);
  assert.deepEqual(result.imoveis, []);
  assert.deepEqual(result.bairros_com_imoveis, [{ bairro: 'Jurerê Internacional', imoveis: 3 }]);
  assert.equal(result.cidades_com_imoveis, undefined);
  assert.equal(criteria.foraDaRegiao, true);
});

test('região: bairros genéricos do catálogo antigo não são oferecidos como alternativa', () => {
  const catalogo = [...CATALOGO, casa('G1', { neighborhood: 'Bairro Nobre de Florianópolis' })];
  const { result } = searchCatalog({ cidade: 'Florianópolis', bairros: ['Lugar Nenhum'] }, { allProperties: catalogo, vocabulary: buildVocabulary(catalogo) });
  assert.deepEqual(result.bairros_com_imoveis.map(b => b.bairro), ['Jurerê Internacional']);
});

test('região: bairro dito sozinho e desconhecido também confirma que não há', () => {
  const { result } = buscar({ bairros: ['Moema'] });
  assert.equal(result.regiao_sem_imoveis, true);
  assert.equal(result.regiao_pedida, 'Moema');
  assert.deepEqual(result.imoveis, []);
  assert.ok(result.cidades_com_imoveis.length > 0);
});

test('região: com um bairro conhecido e outro não, a busca segue com o que existe e avisa', () => {
  const { result, criteria } = buscar({ cidade: 'Florianópolis', bairros: ['Jurerê Internacional', 'Lugar Nenhum'] });
  assert.equal(result.regiao_sem_imoveis, undefined);
  assert.equal(result.total_compativeis, 3);
  assert.match(result.avisos[0], /Bairro "Lugar Nenhum" não está no catálogo/);
  assert.equal(criteria.foraDaRegiao, undefined);
});

test('região: cidade conhecida por sigla ou estado continua funcionando', () => {
  assert.equal(buscar({ cidade: 'Curitiba - PR' }).result.total_compativeis, 1);
  assert.equal(buscar({ cidade: 'Paraná' }).result.total_compativeis, 1);
});

test('busca: orçamento baixo demais ou absurdo não é usado e manda confirmar com a pessoa', () => {
  for (const orcamento of [50_000, 5_000_000_000]) {
    const { result } = buscar({ cidade: 'Florianópolis', orcamento_max: orcamento });
    assert.equal(result.criterios_aplicados.orcamento_max, null, `orçamento ${orcamento} não deveria filtrar`);
    assert.equal(result.total_compativeis, 3);
    assert.match(result.avisos[0], /Confirme|confirme/);
  }
});

test('busca sem compatíveis: devolve os 3 imóveis mais próximos com o que não atende', () => {
  const { result } = buscar({ cidade: 'Curitiba', quartos_min: 9 });
  assert.equal(result.total_compativeis, 0);
  assert.equal(result.mais_proximos.length, 1, 'só há 1 imóvel em Curitiba');
  assert.ok(result.mais_proximos[0].o_que_nao_atende.some(t => /quartos/.test(t)));
});

// ---------------------------------------------------------------------------------------------
const PERFIL_VAZIO = { location: { city: 'São Paulo', neighborhoods: [] }, typology: { propertyType: 'Todos', minBedrooms: 0 }, budget: { maxBudget: 10_000_000 }, lifestyle: { amenities: [] } };

test('contexto do visitante: sem nada relevante devolve null (o Concierge usa a saudação padrão)', () => {
  assert.equal(buildVisitorContext({ profile: PERFIL_VAZIO, allProperties: CATALOGO }), null);
});

test('contexto do visitante: a cidade padrão do perfil não conta como escolha da pessoa', () => {
  const ctx = buildVisitorContext({ profile: { ...PERFIL_VAZIO, typology: { propertyType: 'Casa', minBedrooms: 3 } }, allProperties: CATALOGO });
  assert.equal(ctx.criterios.cidade, null);
  assert.equal(ctx.criterios.tipo, 'Casa');
  assert.equal(ctx.criterios.quartos_min, 3);
  assert.equal(ctx.criterios.orcamento_max, null, '10 milhões é "sem limite"');
  const comFiltro = buildVisitorContext({ profile: PERFIL_VAZIO, selectedCity: 'Curitiba', allProperties: CATALOGO });
  assert.equal(comFiltro.criterios.cidade, 'Curitiba');
});

test('contexto do visitante: imóveis vistos sem repetir, favoritos, ações e críticas', () => {
  const timeline = [
    { type: 'VIEW_PROPERTY', metadata: { propertyId: 'F1' } },
    { type: 'VIEW_PROPERTY', metadata: { propertyId: 'F1' } },
    { type: 'VIEW_PROPERTY', metadata: { propertyId: 'C1' } },
    { type: 'VIEW_PROPERTY', metadata: { propertyId: 'NAO_EXISTE' } },
    { type: 'MORTGAGE_SIMULATION' }, { type: 'MORTGAGE_SIMULATION' },
    { type: 'PROPERTY_CRITICISM', description: 'achei caro' }
  ];
  const ctx = buildVisitorContext({ profile: PERFIL_VAZIO, timeline, favorites: ['F2', 'ZZZ'], allProperties: CATALOGO });
  assert.deepEqual(ctx.imoveis_vistos.map(i => i.id), ['F1', 'C1']);
  assert.deepEqual(ctx.favoritos.map(i => i.id), ['F2']);
  assert.deepEqual(ctx.acoes, ['simulou financiamento']);
  assert.deepEqual(ctx.criticas, ['achei caro']);
  assert.equal(ctx.imoveis_vistos[0].preco_texto, 'R$ 3.000.000');
});

test('contexto do visitante: o nome só entra se a pessoa se identificou; a busca é cortada em 80', () => {
  const base = { allProperties: CATALOGO, searchQuery: 'x'.repeat(200) };
  const anonimo = buildVisitorContext({ ...base, profile: { ...PERFIL_VAZIO, metadata: { isIdentified: false, leadName: 'Ana' } } });
  assert.equal(anonimo.nome, null);
  assert.equal(anonimo.busca_texto.length, 80);
  const identificado = buildVisitorContext({ ...base, profile: { ...PERFIL_VAZIO, metadata: { isIdentified: true, leadName: 'Ana Maria' } } });
  assert.equal(identificado.nome, 'Ana Maria');
});

// ---------------------------------------------------------------------------------------------
test('saudação: sem visitante conhecido mantém a padrão (null)', () => {
  assert.equal(buildGreeting(null), null);
  assert.equal(buildGreeting({ criterios: {}, imoveis_vistos: [], favoritos: [] }), null);
});

test('saudação: usa tipo, bairro ou cidade e só o primeiro nome', () => {
  const s = buildGreeting({ nome: 'Ana Maria', criterios: { tipo: 'Casa', bairros: ['Batel'], cidade: 'Curitiba' } });
  assert.match(s, /^Olá Ana! Aqui é o atendimento da Urban Real State\./);
  assert.match(s, /de olho em casas em Batel/);
  assert.match(buildGreeting({ criterios: { cidade: 'Vitória' } }), /de olho em imóveis em Vitória/);
});

test('saudação: sem critérios, lembra do último imóvel visto, com o artigo certo', () => {
  assert.match(buildGreeting({ criterios: {}, imoveis_vistos: [{ tipo: 'Apartamento', bairro: 'Batel' }] }), /olhou um apartamento em Batel/);
  assert.match(buildGreeting({ criterios: {}, favoritos: [{ tipo: 'Casa', bairro: 'Jurerê' }] }), /olhou uma casa em Jurerê/);
});
