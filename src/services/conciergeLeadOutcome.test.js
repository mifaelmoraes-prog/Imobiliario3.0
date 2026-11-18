// O aviso ao visitante depende do resultado real da gravação. Rodar com: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { leadOutcome } from './conciergeLeadOutcome.js';

const dados = { name: 'Ana', contato: '(27) 99999-0000', quando: ' · à tarde', ids: ['QUA-1', 'RIV-2'] };

test('gravação deu certo: confirma o contato e devolve os imóveis ao modelo', () => {
  const r = leadOutcome({ ok: true }, dados);
  assert.equal(r.registrado, true);
  assert.equal(r.notice, 'Contato registrado: Ana · (27) 99999-0000 · à tarde');
  assert.deepEqual(r.result, { registrado: true, imoveis_ids: ['QUA-1', 'RIV-2'] });
});

test('gravação falhou: não diz "registrado" e orienta o modelo a não prometer retorno', () => {
  const r = leadOutcome({ ok: false, motivo: 'indisponivel' }, dados);
  assert.equal(r.registrado, false);
  assert.doesNotMatch(r.notice, /registrado/i);
  assert.match(r.notice, /Não consegui enviar/);
  assert.equal(r.result.registrado, false);
  assert.equal(r.result.erro, 'nao_foi_possivel_enviar');
  assert.match(r.result.orientacao, /NÃO chegou à equipe/);
  assert.match(r.result.orientacao, /Não prometa/);
  assert.equal('imoveis_ids' in r.result, false, 'não devolve imóveis como se tivesse registrado');
});

test('resultado ausente ou inesperado é tratado como falha (nunca como sucesso)', () => {
  for (const saved of [undefined, null, {}, { ok: 'true' }, { ok: 1 }, { ok: false }]) {
    assert.equal(leadOutcome(saved, dados).registrado, false, `deveria falhar com ${JSON.stringify(saved)}`);
  }
});
