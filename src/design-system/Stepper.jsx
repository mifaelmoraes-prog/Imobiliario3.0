import React from 'react';
import { Minus, Plus } from 'lucide-react';

/**
 * Stepper numérico ergonômico [− Valor +] com alvos de toque mínimos de 44px
 * Resolve GAP-05.4 (substituindo chips minúsculos por steppers fáceis de tocar).
 */
export function Stepper({
  label,
  value = 0,
  min = 0,
  max = 10,
  unit = '',
  pluralUnit = '',
  onChange,
  disabled = false,
  className = ''
}) {
  const handleDecrement = (e) => {
    e.preventDefault();
    if (value > min && onChange) {
      onChange(value - 1);
    }
  };

  const handleIncrement = (e) => {
    e.preventDefault();
    if (value < max && onChange) {
      onChange(value + 1);
    }
  };

  const displayUnit = value === 1 ? (unit || '') : (pluralUnit || unit || '');
  const displayLabel = value === 0 ? 'Qualquer' : `${value}${displayUnit ? ` ${displayUnit}` : ''}`;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <span className="text-xs font-medium text-stone-600 dark:text-stone-300">
          {label}
        </span>
      )}
      <div className="flex items-center justify-between bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-1 shadow-sm">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          aria-label={`Diminuir ${label || 'quantidade'}`}
          className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-md text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>

        <span className="px-3 text-sm font-semibold text-stone-900 dark:text-stone-100 tabular-nums text-center select-none">
          {displayLabel}
        </span>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          aria-label={`Aumentar ${label || 'quantidade'}`}
          className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-md text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

