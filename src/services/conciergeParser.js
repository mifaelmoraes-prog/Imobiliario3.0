/**
 * conciergeParser.js
 * Funções puras de extração usadas pelo Concierge (US-02).
 */

// Converte "1.200.000", "1,5", "1.8", "950.000,00" em número.
function parseBrazilianNumber(raw) {
  let s = raw.trim();
  // Separador de milhar: grupos de 3 dígitos após ponto (ex.: 1.200.000)
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Extrai o teto orçamentário de um texto livre em pt-BR.
 * Aceita: "até 800 mil", "1,5 milhão", "2 milhões", "2 mi", "R$ 950.000", "1.200.000".
 * Retorna o valor em reais ou null se nada plausível for encontrado.
 */
export function extractBudget(text) {
  const lower = text.toLowerCase();

  // 1. Número + unidade por extenso. "mil" precisa ser testado antes de "mi".
  const withUnit = lower.match(/(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(milh(?:ões|oes|ão|ao)|mil(?![a-zà-ú])|mi(?![a-zà-ú])|kk?(?![a-z]))/);
  if (withUnit) {
    const num = parseBrazilianNumber(withUnit[1]);
    const unit = withUnit[2];
    if (num !== null) {
      const val = unit === 'mil' || unit === 'k' ? num * 1_000 : num * 1_000_000;
      return val >= 50_000 ? Math.round(val) : null;
    }
  }

  // 2. Valor monetário sem unidade: "R$ 950.000", "1.200.000" ou "R$ 750000".
  const plain = lower.match(/(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)/) || lower.match(/r\$\s*(\d{5,})/);
  if (plain) {
    const val = parseBrazilianNumber(plain[1]);
    if (val !== null && val >= 50_000) return Math.round(val);
  }

  return null;
}
