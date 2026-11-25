// Avatar de Natal na temporada (1/12 a 6/1) e prévia por ?avatar=natal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { avatarDaEpoca, AVATAR_NATAL, AVATAR_PADRAO } from './avatarDaEpoca.js';

const dia = (a, m, d) => new Date(a, m - 1, d, 12);

test('fora do Natal: avatar padrão', () => {
  assert.equal(avatarDaEpoca(dia(2026, 11, 25)), AVATAR_PADRAO);
  assert.equal(avatarDaEpoca(dia(2027, 1, 7)), AVATAR_PADRAO);
});

test('de 1º de dezembro a 6 de janeiro: avatar de Natal', () => {
  for (const d of [dia(2026, 12, 1), dia(2026, 12, 25), dia(2026, 12, 31), dia(2027, 1, 1), dia(2027, 1, 6)]) {
    assert.equal(avatarDaEpoca(d), AVATAR_NATAL, d.toDateString());
  }
});

test('?avatar=natal mostra a versão de Natal antes da data', () => {
  assert.equal(avatarDaEpoca(dia(2026, 11, 25), '?avatar=natal'), AVATAR_NATAL);
  assert.equal(avatarDaEpoca(dia(2026, 11, 25), '?utm=x&avatar=natal'), AVATAR_NATAL);
});
