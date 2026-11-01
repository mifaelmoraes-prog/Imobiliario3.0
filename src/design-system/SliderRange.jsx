import React from 'react';

/**
 * Formata valores numéricos para moeda brasileira (BRL).
 */
export function formatCurrencyBRL(value) {
  if (!value || value === 0 || value >= 10000000) return 'Sem Limite';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Slider ergonômico de faixa orçamentária com marcas e valor visual claro
 */
export function SliderRange({
  label = 'Teto Orçamentário',
  value = 2500000,
  min = 300000,
  max = 10000000,
  step = 100000,
  onChange,
  className = ''
}) {
  const isMax = value >= max;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-stone-600 dark:text-stone-300">
          {label}
        </span>
        <span className="text-sm font-bold text-accent tabular-nums">
          {isMax ? 'Sem Limite' : `Até ${formatCurrencyBRL(value)}`}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange && onChange(Number(e.target.value))}
        className="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={label}
      />

      <div className="flex justify-between text-[11px] text-stone-500 font-medium">
        <span>{formatCurrencyBRL(min)}</span>
        <span>R$ 2.5M</span>
        <span>Sem Limite</span>
      </div>
    </div>
  );
}

