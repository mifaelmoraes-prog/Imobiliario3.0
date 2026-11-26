// GET /api/regiao: a UF volta sempre (o portal abre no estado do visitante);
// `ativo` só liga a gravação da estatística quando TRACK_ACCESS_REGION=on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRegiaoRequest } from './regiao.js';

const pedir = (headers, env = {}) => {
  const r = handleRegiaoRequest({ method: 'GET', headers }, env);
  return { status: r.status, corpo: JSON.parse(r.body) };
};

test('devolve país e UF mesmo com a estatística desligada', () => {
  const { status, corpo } = pedir({ 'x-vercel-ip-country': 'BR', 'x-vercel-ip-country-region': 'rs' });
  assert.equal(status, 200);
  assert.deepEqual(corpo, { ativo: false, pais: 'BR', uf: 'RS' });
});

test('com TRACK_ACCESS_REGION=on, ativo vira true', () => {
  const { corpo } = pedir({ 'x-vercel-ip-country': 'BR', 'x-vercel-ip-country-region': 'SP' }, { TRACK_ACCESS_REGION: 'on' });
  assert.deepEqual(corpo, { ativo: true, pais: 'BR', uf: 'SP' });
});

test('fora do Brasil não há UF; sem cabeçalho (ambiente local) não há nada', () => {
  assert.deepEqual(pedir({ 'x-vercel-ip-country': 'PT', 'x-vercel-ip-country-region': '11' }).corpo, { ativo: false, pais: 'PT', uf: null });
  assert.deepEqual(pedir({}).corpo, { ativo: false, pais: null, uf: null });
});

test('valores estranhos no cabeçalho são ignorados', () => {
  assert.deepEqual(pedir({ 'x-vercel-ip-country': 'BR', 'x-vercel-ip-country-region': '<script>' }).corpo, { ativo: false, pais: 'BR', uf: null });
});

test('só aceita GET', () => {
  assert.equal(handleRegiaoRequest({ method: 'POST', headers: {} }, {}).status, 405);
});
