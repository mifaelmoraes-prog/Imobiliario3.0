// Testes da proteção das rotas pagas. Rodar com: npm test
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { checkOrigin, clientKey, takeToken, guardRequest, resetGuard } from './guard.js';
import { handleConciergeRequest } from './conciergeBrain.js';
import { handleTtsRequest } from './geminiTts.js';

const HOST = 'urban.example.com';
const headersDaPagina = (extra = {}) => ({ origin: `https://${HOST}`, host: HOST, 'x-forwarded-for': '203.0.113.7', ...extra });

beforeEach(() => resetGuard());

test('checkOrigin: aceita só a própria página', () => {
  assert.equal(checkOrigin({ origin: `https://${HOST}`, host: HOST }), true);
  assert.equal(checkOrigin({ referer: `https://${HOST}/imoveis?x=1`, host: HOST }), true, 'Referer vale na falta do Origin');
  assert.equal(checkOrigin({ origin: 'https://outro-site.com', host: HOST }), false);
  assert.equal(checkOrigin({ origin: 'null', host: HOST }), false, 'Origin "null" não derruba o servidor');
  assert.equal(checkOrigin({ origin: 'lixo', host: HOST }), false);
  assert.equal(checkOrigin({ host: HOST }), false, 'sem Origin nem Referer');
  assert.equal(checkOrigin({ origin: `https://${HOST}` }), false, 'sem host');
  assert.equal(checkOrigin({ origin: `https://${HOST}.evil.com`, host: HOST }), false, 'host parecido não vale');
});

test('clientKey: usa o primeiro IP de x-forwarded-for', () => {
  assert.equal(clientKey({ 'x-forwarded-for': '198.51.100.4, 10.0.0.1' }), '198.51.100.4');
  assert.equal(clientKey({ 'x-real-ip': '198.51.100.9' }), '198.51.100.9');
  assert.equal(clientKey({}), 'desconhecido');
});

test('takeToken: bloqueia acima do limite e libera quando a janela passa', () => {
  const j = 1000;
  assert.deepEqual(takeToken('a', { limit: 2, janelaMs: j, agora: 0 }), { ok: true });
  assert.deepEqual(takeToken('a', { limit: 2, janelaMs: j, agora: 100 }), { ok: true });
  const barrado = takeToken('a', { limit: 2, janelaMs: j, agora: 200 });
  assert.equal(barrado.ok, false);
  assert.equal(barrado.retryAfter, 1);
  assert.equal(takeToken('b', { limit: 2, janelaMs: j, agora: 200 }).ok, true, 'outro visitante não é afetado');
  assert.equal(takeToken('a', { limit: 2, janelaMs: j, agora: 1001 }).ok, true, 'a primeira chamada saiu da janela');
});

test('guardRequest: 403 sem origem, 429 acima do limite, limite configurável por env', () => {
  const req = { origin: `https://${HOST}`, host: HOST, headers: { 'x-forwarded-for': '203.0.113.7' } };
  assert.deepEqual(guardRequest({ host: HOST, headers: {} }, { name: 'concierge', limit: 5, env: {} }), { status: 403, error: 'forbidden' });

  const env = { RATE_LIMIT_CONCIERGE: '2' };
  assert.equal(guardRequest(req, { name: 'concierge', limit: 60, env }), null);
  assert.equal(guardRequest(req, { name: 'concierge', limit: 60, env }), null);
  const barrado = guardRequest(req, { name: 'concierge', limit: 60, env });
  assert.equal(barrado.status, 429);
  assert.equal(barrado.error, 'rate_limited');
  assert.ok(barrado.retryAfter >= 1);

  resetGuard();
  const invalido = { RATE_LIMIT_CONCIERGE: 'abc' };
  for (let i = 0; i < 3; i++) assert.equal(guardRequest(req, { name: 'concierge', limit: 3, env: invalido }), null, 'valor inválido usa o padrão');
  assert.equal(guardRequest(req, { name: 'concierge', limit: 3, env: invalido }).status, 429);
});

test('Concierge: recusa origem de fora e chamada sem origem; a da página chega até a checagem da chave', async () => {
  const corpo = { messages: [{ role: 'user', content: 'oi' }] };
  const fora = await handleConciergeRequest({ method: 'POST', body: corpo, origin: 'https://outro-site.com', host: HOST, headers: headersDaPagina({ origin: 'https://outro-site.com' }) }, { openai: 'k' });
  assert.equal(fora.status, 403);
  const semOrigem = await handleConciergeRequest({ method: 'POST', body: corpo, host: HOST, headers: { host: HOST } }, { openai: 'k' });
  assert.equal(semOrigem.status, 403);
  const daPagina = await handleConciergeRequest({ method: 'POST', body: corpo, origin: `https://${HOST}`, host: HOST, headers: headersDaPagina() }, {});
  assert.equal(daPagina.status, 503, 'passou pela proteção e parou na chave ausente');
  assert.equal(JSON.parse(daPagina.body).error, 'brain_unconfigured');
});

test('Concierge: responde 429 com Retry-After quando o visitante passa do limite', async () => {
  const anterior = process.env.RATE_LIMIT_CONCIERGE;
  process.env.RATE_LIMIT_CONCIERGE = '2';
  try {
    const chamar = () => handleConciergeRequest({ method: 'POST', body: {}, origin: `https://${HOST}`, host: HOST, headers: headersDaPagina() }, {});
    assert.equal((await chamar()).status, 503);
    assert.equal((await chamar()).status, 503);
    const barrada = await chamar();
    assert.equal(barrada.status, 429);
    assert.ok(Number(barrada.headers['Retry-After']) >= 1);
  } finally {
    if (anterior === undefined) delete process.env.RATE_LIMIT_CONCIERGE;
    else process.env.RATE_LIMIT_CONCIERGE = anterior;
  }
});

test('Voz (TTS): recusa origem de fora; a da página chega até a checagem do provedor', async () => {
  const fora = await handleTtsRequest({ method: 'POST', body: { text: 'oi' }, origin: 'https://outro-site.com', host: HOST, headers: headersDaPagina({ origin: 'https://outro-site.com' }) }, {});
  assert.equal(fora.status, 403);
  const semOrigem = await handleTtsRequest({ method: 'POST', body: { text: 'oi' }, host: HOST, headers: { host: HOST } }, {});
  assert.equal(semOrigem.status, 403);
  const daPagina = await handleTtsRequest({ method: 'POST', body: { text: 'oi' }, origin: `https://${HOST}`, host: HOST, headers: headersDaPagina() }, {});
  assert.equal(daPagina.status, 503);
  assert.equal(JSON.parse(daPagina.body).error, 'tts_unconfigured');
});
