// Motor de compatibilidade entre o perfil do comprador e o imóvel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePropertyMatch } from './smartMatchEngine.js';

const imovel = { price: 900_000, bedrooms: 3, parking: 2, type: 'Casa', neighborhood: 'Batel', amenities: ['Piscina'] };

test('perfil sem nenhum filtro não infla a nota: não há match a exibir', () => {
  const r = calculatePropertyMatch(imovel, {});
  assert.equal(r.score, null);
  assert.equal(r.hasActiveProfile, false);
  assert.equal(r.totalCriteria, 0);
});

test('"sem limite" de orçamento (10 milhões) não conta como filtro', () => {
  assert.equal(calculatePropertyMatch(imovel, { budget: { maxBudget: 10_000_000 } }).hasActiveProfile, false);
});

test('tudo atendido: 100 e todos os pilares', () => {
  const r = calculatePropertyMatch(imovel, {
    budget: { maxBudget: 1_000_000 }, location: { neighborhoods: ['Batel'] }, typology: { minBedrooms: 3 }
  });
  assert.equal(r.score, 100);
  assert.equal(r.criteriaMet, 3);
  assert.equal(r.totalCriteria, 3);
  assert.equal(r.summary, '3 de 3 pilares atendidos');
  assert.deepEqual(r.whyNot, []);
});

test('orçamento: dentro, até 10% acima (nota parcial) e muito acima', () => {
  assert.equal(calculatePropertyMatch(imovel, { budget: { maxBudget: 900_000 } }).whyMatches[0], 'Exatamente dentro do seu teto orçamentário');

  const folga = calculatePropertyMatch(imovel, { budget: { maxBudget: 850_000 } }); // 900k é ~6% acima
  assert.equal(folga.score, 57);
  assert.equal(folga.criteriaMet, 0, 'acima do teto não conta como atendido');
  assert.match(folga.whyNot[0], /ligeiramente acima/);

  const longe = calculatePropertyMatch(imovel, { budget: { maxBudget: 500_000 } });
  assert.equal(longe.score, 0);
  assert.match(longe.whyNot[0], /Acima do teto/);
});

test('localização: o bairro casa por trecho nos dois sentidos', () => {
  const casa = (bairro) => calculatePropertyMatch({ ...imovel, neighborhood: bairro }, { location: { neighborhoods: ['Jurerê'] } });
  assert.equal(casa('Jurerê Internacional').criteriaMet, 1);
  assert.equal(casa('Batel').criteriaMet, 0);
  assert.match(casa('Batel').whyNot[0], /Localizado em Batel/);
});

test('tipologia: quartos mínimos, vagas e tipo contam como critérios separados', () => {
  const r = calculatePropertyMatch(imovel, { typology: { minBedrooms: 4, minParking: 2, propertyType: 'Casa' } });
  assert.equal(r.totalCriteria, 3);
  assert.equal(r.criteriaMet, 2, 'vagas e tipo atendem; os 4 quartos não');
  assert.match(r.whyNot.join(' '), /3 quartos \(você solicitou 4\+\)/);
  assert.equal(calculatePropertyMatch(imovel, { typology: { propertyType: 'Todos' } }).hasActiveProfile, false);
});

test('a nota fica sempre entre 0 e 100', () => {
  const perfis = [
    { budget: { maxBudget: 100_000 } },
    { budget: { maxBudget: 2_000_000 }, location: { neighborhoods: ['Batel'] }, typology: { minBedrooms: 1, minParking: 1, propertyType: 'Casa' }, lifestyle: { amenities: ['Piscina'] } }
  ];
  for (const p of perfis) {
    const { score } = calculatePropertyMatch(imovel, p);
    assert.ok(score >= 0 && score <= 100, `nota ${score} fora do intervalo`);
  }
});

test('imóvel ausente devolve nota 0, sem quebrar', () => {
  assert.equal(calculatePropertyMatch(null, {}).score, 0);
});
