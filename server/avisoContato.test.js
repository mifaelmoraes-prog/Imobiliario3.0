// Aviso por e-mail de contato de corretor.
import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAvisoContatoRequest, limparContato, montarAviso } from './avisoContato.js';
import { resetGuard } from './guard.js';

const ENV = { LEAD_NOTIFY_EMAIL: 'equipe@exemplo.com', RESEND_API_KEY: 'chave-de-teste' };
const req = (body, extra = {}) => ({ method: 'POST', body, host: 'site.com', origin: 'https://site.com', headers: { 'x-forwarded-for': '1.1.1.1' }, ...extra });
const fetchOk = (chamadas) => async (url, opts) => { chamadas.push({ url, opts }); return { ok: true, status: 200 }; };

test.beforeEach(() => resetGuard());

test('sem e-mail de destino ou chave: não envia e não falha', async () => {
  const chamadas = [];
  const r = await handleAvisoContatoRequest(req({ nome: 'Ana' }), {}, fetchOk(chamadas));
  assert.equal(r.status, 200);
  assert.deepEqual(JSON.parse(r.body), { enviado: false, motivo: 'desligado' });
  assert.equal(chamadas.length, 0);
});

test('envia o aviso ao destino configurado, com reply_to do visitante', async () => {
  const chamadas = [];
  const r = await handleAvisoContatoRequest(req({ nome: 'Ana', telefone: '(41) 99999-0000', email: 'ana@x.com', imoveis_ids: ['A1'] }), ENV, fetchOk(chamadas));
  assert.equal(r.status, 200);
  assert.equal(chamadas.length, 1);
  const enviado = JSON.parse(chamadas[0].opts.body);
  assert.deepEqual(enviado.to, ['equipe@exemplo.com']);
  assert.equal(enviado.reply_to, 'ana@x.com');
  assert.match(enviado.text, /Telefone: \(41\) 99999-0000/);
  assert.equal(chamadas[0].opts.headers.Authorization, 'Bearer chave-de-teste');
});

test('o HTML escapa o que o visitante digitou', () => {
  const { html } = montarAviso(limparContato({ nome: '<script>alert(1)</script>', observacoes: 'a & b' }));
  assert.equal(html.includes('<script>'), false);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /a &amp; b/);
});

test('sem nome: contato inválido; quebras de linha no assunto são removidas', async () => {
  const r = await handleAvisoContatoRequest(req({ telefone: '1' }), ENV, fetchOk([]));
  assert.equal(r.status, 400);
  assert.equal(montarAviso(limparContato({ nome: 'Ana\r\nBcc: x@y.com' })).subject.includes('\n'), false);
});

test('o serviço de e-mail recusando ou caindo vira 502 sem derrubar', async () => {
  const recusa = await handleAvisoContatoRequest(req({ nome: 'Ana' }), ENV, async () => ({ ok: false, status: 401 }));
  assert.equal(recusa.status, 502);
  const queda = await handleAvisoContatoRequest(req({ nome: 'Ana' }), ENV, async () => { throw new Error('rede'); });
  assert.equal(queda.status, 502);
});

test('só a própria página, só POST e com limite de uso', async () => {
  assert.equal((await handleAvisoContatoRequest(req({ nome: 'Ana' }, { origin: 'https://outro.com' }), ENV, fetchOk([]))).status, 403);
  assert.equal((await handleAvisoContatoRequest(req({}, { method: 'GET' }), ENV, fetchOk([]))).status, 405);
  let ultimo;
  for (let i = 0; i < 11; i++) ultimo = await handleAvisoContatoRequest(req({ nome: 'Ana' }), ENV, fetchOk([]));
  assert.equal(ultimo.status, 429);
});
