import React from 'react';
import { LayoutGrid, Map } from 'lucide-react';
import { useProperties } from '../../context/PropertyContext';

// Alternador Lista / Mapa. Fica num componente próprio porque precisa aparecer nas duas telas:
// se existisse só na lista, ao abrir o mapa não haveria como voltar. Cada modo tem a sua cor
// (lista em laranja, mapa em verde) e um rótulo, para o botão ser fácil de achar. Borda e
// tamanho maiores a pedido do Paulo (imobiliária), que achou o alternador discreto demais.
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
    inativo: 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600/10'
  }
];

export function ViewModeToggle() {
  const { viewMode, setViewMode } = useProperties();

  return (
    <div
      role="group"
      aria-label="Modo de visualização"
      className="flex items-center gap-1.5 bg-white dark:bg-stone-850 border-2 border-accent/40 dark:border-accent/50 rounded-2xl p-1.5 shadow-md"
    >
      <span className="hidden sm:inline pl-2 pr-1 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Ver em</span>
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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              selecionado ? ativo : inativo
            }`}
          >
            <Icone className="w-5 h-5" strokeWidth={2.5} />
            <span>{rotulo}</span>
          </button>
        );
      })}
    </div>
  );
}
