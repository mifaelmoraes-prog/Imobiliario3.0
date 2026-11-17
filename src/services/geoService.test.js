// Coordenadas dos imóveis e centro do mapa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { getPropertyCoordinates, getMapViewport, CAPITAL_CENTERS, NEIGHBORHOOD_COORDINATES } from './geoService.js';
import { SCRAPED_PROPERTIES } from '../data/scrapedProperties.js';

const km = (a, b) => {
  const R = 6371, rad = Math.PI / 180, dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const centroDe = (cidade) => {
  const chave = Object.keys(CAPITAL_CENTERS).find(c => (cidade || '').toLowerCase().includes(c));
  return chave ? CAPITAL_CENTERS[chave].center : null;
};

test('bairro cadastrado: fica a poucos metros do ponto do bairro', () => {
  const base = NEIGHBORHOOD_COORDINATES['curitiba - pr::batel'];
  assert.ok(base, 'o bairro de teste precisa existir na tabela');
  const [lat, lng] = getPropertyCoordinates({ id: 'x', city: 'Curitiba - PR', neighborhood: 'Batel' });
  assert.ok(km([lat, lng], base) < 1, 'o desvio por rua deve ser pequeno');
});

test('o desvio por rua é determinístico: o mesmo imóvel cai sempre no mesmo ponto', () => {
  const p = { id: 'VIVA-SC-123', city: 'Curitiba - PR', neighborhood: 'Batel' };
  assert.deepEqual(getPropertyCoordinates(p), getPropertyCoordinates({ ...p }));
});

test('bairro desconhecido numa cidade conhecida: usa o centro DA CIDADE, não outra', () => {
  const coords = getPropertyCoordinates({ id: 'x', city: 'Bertioga - SP', neighborhood: 'Bairro Inexistente' });
  assert.ok(km(coords, CAPITAL_CENTERS.bertioga.center) < 1);
});

test('cidade desconhecida cai num ponto neutro (São Paulo) e imóvel ausente num ponto fixo', () => {
  const desconhecida = getPropertyCoordinates({ id: 'x', city: 'Atlantis - XX', neighborhood: 'Y' });
  assert.ok(km(desconhecida, CAPITAL_CENTERS['são paulo'].center) < 1);
  assert.deepEqual(getPropertyCoordinates(null), [-25.4284, -49.2733]);
});

test('catálogo real: toda cidade tem centro cadastrado (nenhuma cai no ponto neutro)', () => {
  // Regressão: cidades novas sem centro apareciam no mapa dentro de São Paulo.
  const semCentro = [...new Set(SCRAPED_PROPERTIES.map(p => p.city))].filter(c => !centroDe(c));
  assert.deepEqual(semCentro, []);
});

test('catálogo real: nenhum imóvel aparece longe da própria cidade', () => {
  const LIMITE_KM = 80; // o mais distante hoje está a ~55 km (Rio de Janeiro)
  const longe = SCRAPED_PROPERTIES
    .map(p => ({ p, d: km(getPropertyCoordinates(p), centroDe(p.city)) }))
    .filter(({ d }) => d > LIMITE_KM)
    .map(({ p, d }) => `${p.id} (${p.city}, ${p.neighborhood}): ${Math.round(d)} km`);
  assert.deepEqual(longe, []);
});

test('getMapViewport: cidade escolhida, "Todas" e cidade desconhecida', () => {
  assert.deepEqual(getMapViewport('Vitória'), { center: CAPITAL_CENTERS['vitória'].center, zoom: 13 });
  assert.deepEqual(getMapViewport('Bertioga - SP').center, CAPITAL_CENTERS.bertioga.center);
  const geral = { center: [-24.8, -47.0], zoom: 6 };
  assert.deepEqual(getMapViewport('Todas'), geral);
  assert.deepEqual(getMapViewport(''), geral);
  assert.deepEqual(getMapViewport('Atlantis'), geral);
});
