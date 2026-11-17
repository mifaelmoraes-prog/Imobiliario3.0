import React from 'react';
import { LayoutGrid, Map } from 'lucide-react';
import { useProperties } from '../../context/PropertyContext';

// Alternador Lista / Mapa. Fica num componente próprio porque precisa aparecer nas duas telas:
// se existisse só na lista, ao abrir o mapa não haveria como voltar. Cada modo tem a sua cor
// (lista em laranja, mapa em verde) e um rótulo, para o botão ser fácil de achar.
const MODOS = [
  {
    modo: 'grid',
    rotulo: 'Lista',
    descricao: 'Visualização em lista',
    Icone: LayoutGrid,
    ativo: 'bg-accent text-white shadow-sm',
    inativo: 'text-accent hover:bg-accent/10'
  },
  {
    modo: 'map',
    rotulo: 'Mapa',
    descricao: 'Visualização em mapa',
    Icone: Map,
    ativo: 'bg-emerald-600 text-white shadow-sm',
    inativo: 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/10'
  }
];

export function ViewModeToggle() {
  const { viewMode, setViewMode } = useProperties();

  return (
    <div
      role="group"
      aria-label="Modo de visualização"
      className="flex items-center gap-1 bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 rounded-xl p-1 shadow-sm"
    >
      {MODOS.map(({ modo, rotulo, descricao, Icone, ativo, inativo }) => {
        const selecionado = viewMode === modo;
        return (
          <button
            key={modo}
            type="button"
            onClick={() => setViewMode(modo)}
            aria-label={descricao}
            aria-pressed={selecionado}
            title={descricao}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selecionado ? ativo : inativo
            }`}
          >
            <Icone className="w-5 h-5" strokeWidth={2.25} />
            <span>{rotulo}</span>
          </button>
        );
      })}
    </div>
  );
}
