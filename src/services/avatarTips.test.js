// Balão do avatar de atendimento: a frase usa o que o visitante já fez no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAvatarTip } from './avatarTips.js';

const vazio = { criterios: { bairros: [] }, imoveis_vistos: [], favoritos: [] };

test('sem nada do visitante: convite padrão', () => {
  assert.deepEqual(buildAvatarTip(null), { chave: 'ola', texto: 'Olá! Posso te ajudar a achar o imóvel certo. É só falar ou digitar.' });
});

test('filtros: tipo, lugar e orçamento entram na frase', () => {
  const dica = buildAvatarTip({ ...vazio, criterios: { tipo: 'Casa', cidade: 'Vitória', bairros: [], orcamento_max: 2_000_000 } });
  assert.equal(dica.texto, 'Procurando casas em Vitória até R$ 2.000.000? Me diga quantos quartos e eu separo os melhores.');
  const comQuartos = buildAvatarTip({ ...vazio, criterios: { tipo: 'Apartamento', bairros: ['Batel'], quartos_min: 3 } });
  assert.match(comQuartos.texto, /^Procurando apartamentos em Batel\? Quer que eu separe/);
  assert.notEqual(dica.chave, comQuartos.chave, 'filtros diferentes geram dicas diferentes');
});

test('imóvel visto vence os filtros, com o artigo certo', () => {
  const base = { ...vazio, criterios: { tipo: 'Casa', cidade: 'Vitória', bairros: [] } };
  const casa = buildAvatarTip({ ...base, imoveis_vistos: [{ id: 'X1', tipo: 'Casa', bairro: 'Jardim Camburi' }] });
  assert.equal(casa.chave, 'visto-X1');
  assert.match(casa.texto, /^Gostou da casa em Jardim Camburi\?/);
  const apto = buildAvatarTip({ ...base, imoveis_vistos: [{ id: 'X2', tipo: 'Apartamento', bairro: 'Batel' }] });
  assert.match(apto.texto, /^Gostou do apartamento em Batel\?/);
});

test('dois favoritos ou mais vencem tudo e o nome entra quando a pessoa se identificou', () => {
  const dica = buildAvatarTip({ ...vazio, nome: 'Ana Maria', favoritos: [{ id: 'A' }, { id: 'B' }], imoveis_vistos: [{ id: 'X', bairro: 'Batel' }] });
  assert.equal(dica.chave, 'favoritos-2');
  assert.match(dica.texto, /^Ana, você salvou 2 imóveis\./);
});

test('só o texto buscado: oferece refinar a busca', () => {
  const dica = buildAvatarTip({ ...vazio, busca_texto: 'varanda gourmet' });
  assert.match(dica.texto, /^Buscando por varanda gourmet\?/);
});
