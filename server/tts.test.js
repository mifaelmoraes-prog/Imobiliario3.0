// Voz do atendimento: sempre a mesma (OpenAI, voz fixa), sem troca de provedor.
import test from 'node:test';
import assert from 'node:assert/strict';
import { handleTtsRequest } from './geminiTts.js';
import { VOZ_DO_ATENDIMENTO } from './openaiTts.js';
import { resetGuard } from './guard.js';

const realFetch = globalThis.fetch;
const req = (body) => ({ method: 'POST', body, host: 'site.com', origin: 'https://site.com', headers: { 'x-forwarded-for': '3.3.3.3' } });

test.beforeEach(() => { resetGuard(); process.env.CONCIERGE_LOG_USAGE = '0'; });
test.afterEach(() => { globalThis.fetch = realFetch; delete process.env.TTS_PROVIDER; });

test('a voz é fixa e masculina, a mesma da saudação gravada', () => {
  assert.equal(VOZ_DO_ATENDIMENTO, 'cedar');
});

test('fala sempre pela OpenAI com a voz fixa, mesmo pedindo outro provedor', async () => {
  const pedidos = [];
  globalThis.fetch = async (url, opts) => {
    pedidos.push({ url, body: JSON.parse(opts.body) });
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
  };
  process.env.TTS_PROVIDER = 'gemini';
  const r = await handleTtsRequest(req({ text: 'Olá.', provider: 'gemini' }), { openai: 'k', gemini: 'g' });
  assert.equal(r.status, 200);
  assert.equal(r.headers['X-TTS-Provider'], 'openai');
  assert.match(pedidos[0].url, /openai\.com/);
  assert.equal(pedidos[0].body.voice, 'cedar');
});

test('sem a chave da OpenAI não cai no Gemini: responde 503 (o atendimento fica no texto)', async () => {
  const r = await handleTtsRequest(req({ text: 'Olá.' }), { gemini: 'g' });
  assert.equal(r.status, 503);
});

test('se a OpenAI falhar, não tenta outro provedor', async () => {
  const urls = [];
  globalThis.fetch = async (url) => { urls.push(url); return { ok: false, status: 500, text: async () => 'erro' }; };
  const realError = console.error; console.error = () => {};
  const r = await handleTtsRequest(req({ text: 'Uma frase que ainda não foi falada.' }), { openai: 'k', gemini: 'g' });
  console.error = realError;
  assert.equal(r.status, 502);
  assert.ok(urls.every(u => /openai\.com/.test(u)), 'nenhuma chamada a outro provedor');
});
