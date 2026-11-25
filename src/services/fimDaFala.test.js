// Espera pelo fim da fala no atendimento por voz.
import test from 'node:test';
import assert from 'node:assert/strict';
import { esperaFimDaFala } from './fimDaFala.js';

test('frase completa: espera padrão, maior que os 1,6 s de antes', () => {
  assert.equal(esperaFimDaFala('quero uma casa com 3 quartos em Vitória'), 2400);
});

test('frase que termina em conectivo ou começo de ideia: espera mais', () => {
  for (const t of ['quero uma casa em', 'eu queria', 'casa com piscina e', 'até', 'procuro um apartamento perto']) {
    assert.equal(esperaFimDaFala(t), 4000, t);
  }
});

test('uma ou duas palavras soltas: espera um pouco mais (pode ser o começo da frase)', () => {
  assert.equal(esperaFimDaFala('Vitória'), 3000);
  assert.equal(esperaFimDaFala('três quartos'), 3000);
});

test('acentos e pontuação não atrapalham', () => {
  assert.equal(esperaFimDaFala('Então...'), 4000);
  assert.equal(esperaFimDaFala(''), 2400);
});
