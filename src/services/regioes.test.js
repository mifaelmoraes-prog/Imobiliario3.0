// Filtro por região → estado → cidade (pedido do Paulo), com o catálogo real.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SCRAPED_PROPERTIES as IMOVEIS } from '../data/scrapedProperties.js';
import { REGIOES, ehLitoral, regiaoDaUf, filtrarPorLocal, montarArvoreDeLocais, descreverLocal } from './regioes.js';
import { ufDaCidade } from './cidade.js';

test('todo imóvel do catálogo está em Sudeste ou Sul', () => {
  const fora = IMOVEIS.filter(p => !regiaoDaUf(ufDaCidade(p.city))).map(p => p.city);
  assert.deepEqual(fora, []);
});

test('regiaoDaUf', () => {
  assert.equal(regiaoDaUf('rs'), 'Sul');
  assert.equal(regiaoDaUf('ES'), 'Sudeste');
  assert.equal(regiaoDaUf('BA'), null);
  assert.equal(regiaoDaUf(null), null);
});

test('litoral: cidades de praia sim, capitais sem praia não', () => {
  assert.ok(ehLitoral('Xangri-Lá - RS'));
  assert.ok(ehLitoral('Florianópolis - SC'));
  assert.ok(!ehLitoral('Porto Alegre - RS'));
  assert.ok(!ehLitoral('São Paulo - SP'));
});

test('filtro por região, estado, litoral e cidade', () => {
  const sul = filtrarPorLocal(IMOVEIS, { regiao: 'Sul' });
  assert.ok(sul.length > 0 && sul.every(p => ['RS', 'SC', 'PR'].includes(ufDaCidade(p.city))));

  const rs = filtrarPorLocal(IMOVEIS, { regiao: 'Sul', uf: 'RS' });
  assert.ok(rs.some(p => p.city === 'Porto Alegre - RS') && rs.some(p => p.city === 'Xangri-Lá - RS'));

  const litoralRs = filtrarPorLocal(IMOVEIS, { regiao: 'Sul', uf: 'RS', litoral: true });
  assert.ok(litoralRs.length > 0);
  assert.ok(litoralRs.every(p => p.city !== 'Porto Alegre - RS' && p.city.endsWith('- RS')));

  const xangri = filtrarPorLocal(IMOVEIS, { uf: 'RS', cidade: 'Xangri-Lá' });
  assert.ok(xangri.length > 0 && xangri.every(p => p.city === 'Xangri-Lá - RS'));

  assert.equal(filtrarPorLocal(IMOVEIS, {}).length, IMOVEIS.length);
});

test('árvore só tem o que tem imóvel e os totais batem', () => {
  const arvore = montarArvoreDeLocais(IMOVEIS);
  assert.deepEqual(arvore.map(r => r.nome), REGIOES.map(r => r.nome));
  assert.equal(arvore.reduce((s, r) => s + r.total, 0), IMOVEIS.length);
  for (const r of arvore) {
    for (const e of r.estados) {
      assert.ok(e.total > 0);
      assert.equal(e.cidades.reduce((s, c) => s + c.total, 0), e.total);
    }
  }
  const rs = arvore.find(r => r.nome === 'Sul').estados.find(e => e.uf === 'RS');
  assert.ok(rs.litoral > 0 && rs.litoral < rs.total, 'RS tem litoral e capital');
});

test('descreverLocal', () => {
  assert.equal(descreverLocal({ regiao: 'Sul', uf: 'RS', litoral: true }), 'Litoral de Rio Grande do Sul');
  assert.equal(descreverLocal({ regiao: 'Sudeste' }), 'Sudeste');
  assert.equal(descreverLocal({ uf: 'ES', cidade: 'Vitória' }), 'Vitória');
  assert.equal(descreverLocal({}), '');
});
