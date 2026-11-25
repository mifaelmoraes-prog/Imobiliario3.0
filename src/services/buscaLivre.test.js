// Busca do topo por frase (digitada ou falada): os casos relatados pelo Paulo e pelo Mifael.
import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretarBusca, aplicarBusca } from './buscaLivre.js';
import { buildVocabulary } from './conciergeParser.js';
import { SCRAPED_PROPERTIES } from '../data/scrapedProperties.js';

const vocabulary = buildVocabulary(SCRAPED_PROPERTIES);
const buscar = (texto) => {
  const b = interpretarBusca(texto, vocabulary);
  return { b, ...(b ? aplicarBusca(SCRAPED_PROPERTIES, b) : { imoveis: [], aviso: null }) };
};

test('"casa de aluguel em São Paulo": avisa que é só venda e mostra casas à venda em São Paulo', () => {
  const { b, imoveis, aviso } = buscar('casa de aluguel em São Paulo');
  assert.equal(b.aluguel, true);
  assert.equal(b.tipo, 'Casa');
  assert.equal(b.cidade.shortLabel, 'São Paulo');
  assert.ok(imoveis.length > 0);
  assert.ok(imoveis.every(p => p.type === 'Casa' && p.city.startsWith('São Paulo')));
  assert.match(aviso, /só com imóveis à venda/);
  assert.match(aviso, /Mostrando casas à venda em São Paulo/);
});

test('"casa de praia em Xangri-lá RS": diz que não temos e mostra casas no litoral', () => {
  const { b, imoveis, aviso } = buscar('casa de praia em Xangri-lá RS');
  assert.equal(b.lugarDesconhecido, 'Xangri-lá');
  assert.equal(b.uf, 'RS');
  assert.equal(b.cidade, null, 'a sigla RS não pode virar Porto Alegre');
  assert.ok(imoveis.length > 0);
  assert.ok(imoveis.every(p => p.type === 'Casa'));
  assert.ok(imoveis.every(p => !p.city.startsWith('Porto Alegre')), 'Porto Alegre não é praia');
  assert.match(aviso, /^Ainda não temos imóveis em Xangri-lá \(RS\)\. Separamos casas com perfil parecido no litoral\./);
});

test('lugar desconhecido sem praia: prefere o mesmo estado', () => {
  const { imoveis, aviso } = buscar('apartamento em Canoas RS');
  assert.ok(imoveis.length > 0);
  assert.ok(imoveis.every(p => p.city.endsWith('- RS') && p.type === 'Apartamento'));
  assert.match(aviso, /Ainda não temos imóveis em Canoas \(RS\)\. Separamos apartamentos com perfil parecido no RS\./);
});

test('voz em minúsculas e sem acento funciona igual', () => {
  const { b } = buscar('casa de praia em xangri la rs');
  assert.equal(b.lugarDesconhecido, 'xangri la');
  assert.equal(b.uf, 'RS');
});

test('lugares que existem não viram "desconhecidos"', () => {
  for (const texto of ['apartamento em Vitória de 3 quartos', 'casa em Jardim Camburi até 2 milhões', 'casa em Florianópolis', 'apartamento no Batel']) {
    const { b, imoveis } = buscar(texto);
    assert.equal(b.lugarDesconhecido, null, texto);
    assert.ok(imoveis.length > 0, `${texto} deveria achar imóveis`);
  }
});

test('critérios da frase filtram: quartos e orçamento', () => {
  const { imoveis } = buscar('casa em Vitória com 4 quartos até 3 milhões');
  assert.ok(imoveis.length > 0);
  assert.ok(imoveis.every(p => p.bedrooms >= 4 && p.price <= 3_000_000 && p.city.startsWith('Vitória')));
});

test('texto sem critério reconhecível fica com a busca literal (null)', () => {
  assert.equal(interpretarBusca('Quadra Realty', vocabulary), null);
  assert.equal(interpretarBusca('', vocabulary), null);
});

test('nada atende: aviso pede para tirar um filtro', () => {
  const { imoveis, aviso } = buscar('cobertura em Curitiba com 9 quartos');
  assert.equal(imoveis.length, 0);
  assert.match(aviso, /Não encontramos coberturas com esses critérios/);
});
