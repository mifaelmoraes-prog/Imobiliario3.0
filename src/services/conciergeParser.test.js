// Parser de texto livre do Concierge (orçamento, quartos, tipo, cidade, bairro, comodidades).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractBudget, normalizeText, extractBedrooms, extractPropertyType,
  buildVocabulary, extractLocationAndLifestyle
} from './conciergeParser.js';
import { SCRAPED_PROPERTIES } from '../data/scrapedProperties.js';

test('extractBudget: entende os formatos em pt-BR', () => {
  const casos = {
    'até 800 mil': 800_000, '500 mil': 500_000, '800k': 800_000,
    '1,5 milhão': 1_500_000, '1.5 milhoes': 1_500_000, '2 milhões': 2_000_000, '2 mi': 2_000_000, '1,2 mi': 1_200_000,
    'R$ 950.000': 950_000, '1.200.000': 1_200_000, 'R$ 750000': 750_000
  };
  for (const [texto, esperado] of Object.entries(casos)) assert.equal(extractBudget(texto), esperado, texto);
});

test('extractBudget: valores implausíveis ou sem número viram null', () => {
  for (const texto of ['até 30 mil', '2 milhas', 'quero 3 quartos', '']) assert.equal(extractBudget(texto), null, JSON.stringify(texto));
});

test('normalizeText: minúsculas, sem acento, sem pontuação', () => {
  assert.equal(normalizeText('Jurerê Internacional!'), 'jurere internacional');
  assert.equal(normalizeText(null), '');
});

test('extractBedrooms: números e por extenso, com limites', () => {
  const casos = { '3 quartos': 3, 'três dormitórios': 3, '2 dorms': 2, 'um quarto': 1, 'dois quartos': 2, 'quero 4 quartos com suíte': 4 };
  for (const [texto, esperado] of Object.entries(casos)) assert.equal(extractBedrooms(texto), esperado, texto);
  for (const texto of ['quarto', '15 quartos', '0 quartos']) assert.equal(extractBedrooms(texto), null, texto);
});

test('extractPropertyType: palavra inteira ("casal" não vira Casa)', () => {
  const casos = {
    apartamento: 'Apartamento', 'um apto': 'Apartamento', flat: 'Apartamento', 'ap de 2 quartos': 'Apartamento',
    'cobertura duplex': 'Cobertura', sobrado: 'Casa', 'casa térrea': 'Casa'
  };
  for (const [texto, esperado] of Object.entries(casos)) assert.equal(extractPropertyType(texto), esperado, texto);
  for (const texto of ['casal', 'quero morar bem']) assert.equal(extractPropertyType(texto), null, texto);
});

const CATALOGO = [
  { id: 'A', city: 'Florianópolis - SC', neighborhood: 'Jurerê Internacional', amenities: ['Piscina', 'Churrasqueira'] },
  { id: 'B', city: 'Curitiba - PR', neighborhood: 'Batel', amenities: ['Piscina', 'Varanda Gourmet'] },
  { id: 'C', city: 'Bertioga - SP', neighborhood: 'Riviera de São Lourenço', amenities: [] }
];

test('buildVocabulary: cidades, bairros e comodidades vêm do catálogo', () => {
  const v = buildVocabulary(CATALOGO);
  assert.deepEqual(v.cities.map(c => c.shortLabel), ['Florianópolis', 'Curitiba', 'Bertioga']);
  assert.deepEqual(v.neighborhoods.map(n => n.label), ['Jurerê Internacional', 'Batel', 'Riviera de São Lourenço']);
  assert.deepEqual(v.amenities.map(a => a.label), ['Piscina', 'Churrasqueira', 'Varanda Gourmet']);
});

test('extractLocationAndLifestyle: acha cidade, bairro e comodidade do catálogo', () => {
  const v = buildVocabulary(CATALOGO);
  assert.deepEqual(extractLocationAndLifestyle('algo no Batel', v).neighborhoods, ['Batel']);
  assert.equal(extractLocationAndLifestyle('casa em Curitiba', v).city.shortLabel, 'Curitiba');
  assert.deepEqual(extractLocationAndLifestyle('com varanda gourmet', v).amenities, ['Varanda Gourmet']);
  const nada = extractLocationAndLifestyle('sem nada específico', v);
  assert.equal(nada.city, null);
  assert.deepEqual([nada.neighborhoods, nada.amenities, nada.unsupportedAmenities], [[], [], []]);
});

test('siglas de estado só valem em maiúsculas ("pr" e "es" são palavras comuns)', () => {
  const v = buildVocabulary(CATALOGO);
  assert.equal(extractLocationAndLifestyle('quero ver no PR', v).city?.shortLabel, 'Curitiba');
  assert.equal(extractLocationAndLifestyle('isso pr aí', v).city, null);
});

test('comodidade que o catálogo TEM não é marcada como "não suportada"', () => {
  // Regressão: a lista fixa de "não suportadas" (piscina, academia, churrasqueira) continuava
  // avisando que o catálogo não registra piscina mesmo depois de existirem imóveis com piscina.
  const v = buildVocabulary(CATALOGO);
  const r = extractLocationAndLifestyle('quero piscina e churrasqueira', v);
  assert.deepEqual(r.amenities, ['Piscina', 'Churrasqueira']);
  assert.deepEqual(r.unsupportedAmenities, []);
});

test('comodidade que o catálogo NÃO tem continua sendo avisada como não suportada', () => {
  const v = buildVocabulary(CATALOGO);
  const r = extractLocationAndLifestyle('quero academia e aceita pet', v);
  assert.deepEqual(r.amenities, []);
  assert.deepEqual(r.unsupportedAmenities, ['Academia', 'Pet Friendly']);
});

test('catálogo real: piscina existe e não gera o aviso de "não registrada"', () => {
  const v = buildVocabulary(SCRAPED_PROPERTIES);
  const r = extractLocationAndLifestyle('quero um apartamento com piscina', v);
  assert.ok(r.amenities.includes('Piscina'));
  assert.equal(r.unsupportedAmenities.includes('Piscina'), false);
});
