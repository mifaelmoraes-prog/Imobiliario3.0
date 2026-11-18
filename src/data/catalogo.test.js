// Qualidade do catálogo: impede a volta de dados inventados ou quebrados. Rodar com: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SCRAPED_PROPERTIES as IMOVEIS } from './scrapedProperties.js';

const PUBLIC_DIR = path.resolve(import.meta.dirname, '../../public');
const todasAsFotos = (p) => Object.values(p.images || {}).concat(p.image || []).filter(Boolean);
const descreve = (p) => `${p.id} (${p.city}, ${p.neighborhood})`;

test('ids são únicos', () => {
  const ids = IMOVEIS.map(p => p.id);
  const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(repetidos, []);
});

test('campos essenciais preenchidos e coerentes', () => {
  for (const p of IMOVEIS) {
    assert.ok(p.price > 0, `preço inválido em ${descreve(p)}`);
    assert.ok(p.area > 0, `área inválida em ${descreve(p)}`);
    assert.ok(p.city && /-\s?[A-Z]{2}$/.test(p.city), `cidade deve ter o formato "Cidade - UF" em ${descreve(p)}`);
    assert.ok(p.neighborhood, `bairro vazio em ${descreve(p)}`);
    assert.ok(p.images?.hero, `sem foto principal em ${descreve(p)}`);
  }
});

test('nenhum imóvel usa foto de banco de imagens (Unsplash)', () => {
  const comBanco = IMOVEIS.filter(p => todasAsFotos(p).some(u => /unsplash\.com/.test(u)));
  assert.deepEqual(comBanco.map(descreve), []);
});

test('as fotos locais existem em public/', () => {
  const faltando = [];
  for (const p of IMOVEIS) {
    for (const url of todasAsFotos(p)) {
      if (url.startsWith('/') && !fs.existsSync(path.join(PUBLIC_DIR, url))) faltando.push(`${p.id}: ${url}`);
    }
  }
  assert.deepEqual(faltando, []);
});

test('nenhuma foto se repete dentro do mesmo imóvel (galeria sem duplicata)', () => {
  const duplicadas = IMOVEIS.filter(p => {
    const fotos = Object.values(p.images || {}).filter(Boolean);
    return new Set(fotos).size !== fotos.length;
  });
  assert.deepEqual(duplicadas.map(descreve), []);
});

test('comodidades não são um texto-padrão repetido entre imóveis', () => {
  const grupos = new Map();
  for (const p of IMOVEIS) {
    if (!p.amenities?.length) continue;
    const chave = JSON.stringify([...p.amenities].sort());
    grupos.set(chave, (grupos.get(chave) || 0) + 1);
  }
  const repetidos = [...grupos].filter(([, n]) => n > 3).map(([chave, n]) => `${n}x ${chave}`);
  assert.deepEqual(repetidos, [], 'mesma lista de comodidades em mais de 3 imóveis indica dado inventado');
});

test('campos de texto inventado não existem mais no catálogo', () => {
  const comInventado = IMOVEIS.filter(p => 'subjectiveVocations' in p || 'roomBreakdown' in p);
  assert.deepEqual(comInventado.map(descreve), []);
});

test('imóveis de parceiras têm miniatura leve para os cards', () => {
  const LIMITE_KB = 80; // a foto original tem 1000 px e até 220 KB; o card mostra ~340 px
  for (const p of IMOVEIS.filter(x => x.sourceName)) {
    assert.ok(p.images?.thumb, `miniatura ausente em ${descreve(p)}`);
    const arquivo = path.join(PUBLIC_DIR, p.images.thumb);
    assert.ok(fs.existsSync(arquivo), `arquivo da miniatura não existe: ${p.images.thumb}`);
    const kb = fs.statSync(arquivo).size / 1024;
    assert.ok(kb <= LIMITE_KB, `miniatura de ${descreve(p)} tem ${Math.round(kb)} KB (limite ${LIMITE_KB} KB)`);
  }
});

test('imóveis de parceiras identificam a origem e têm link do anúncio', () => {
  for (const p of IMOVEIS.filter(x => x.sourceName)) {
    assert.match(p.sourceUrl || '', /^https:\/\//, `link do anúncio ausente em ${descreve(p)}`);
    assert.ok(p.sourceCode, `código do anúncio ausente em ${descreve(p)}`);
  }
});
