import React from 'react';
import { SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import { useBuyerProfile } from '../../context/BuyerProfileContext';
import { useProperties } from '../../context/PropertyContext';
import { formatCurrencyBRL } from '../../design-system/SliderRange';

export function ProfileCompactStrip({ onOpenDrawer }) {
  const { profile, updatePillar, toggleAmenity, resetProfile, activePillarsCount } = useBuyerProfile();
  const { properties, rawPropertiesCount } = useProperties();

  const maxBudget = profile.budget?.maxBudget;
  const isBudgetLimited = maxBudget && maxBudget < 10000000;
  const bedrooms = profile.typology?.minBedrooms || 0;
  const propertyType = profile.typology?.propertyType;
  const amenities = profile.lifestyle?.amenities || [];
  const neighborhoods = profile.location?.neighborhoods || [];

  const hasAnyFilter = activePillarsCount > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
      <div className="bg-white dark:bg-stone-850 rounded-xl border border-stone-200 dark:border-stone-800 shadow-card py-2.5 px-4 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        
        {/* Resumo Dinâmico dos 4 Pilares (Ref. UX Tópico 05 / GAP-05.1) */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <span className="font-semibold text-stone-500 dark:text-stone-400 shrink-0 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline">Perfil de Busca:</span>
          </span>

          {!hasAnyFilter ? (
            <span className="text-stone-500 italic">
              Nenhum filtro restritivo aplicado (exibindo todo o acervo).
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Orçamento */}
              {isBudgetLimited && (
                <span className="inline-flex items-center gap-1 bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-2 py-0.5 rounded-md font-medium border border-stone-200/60 dark:border-stone-700">
                  <span>Até {formatCurrencyBRL(maxBudget)}</span>
                  <button
                    onClick={() => updatePillar('budget', { maxBudget: 10000000 })}
                    aria-label="Remover limite de orçamento"
                    className="hover:text-accent ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Quartos */}
              {bedrooms > 0 && (
                <span className="inline-flex items-center gap-1 bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-2 py-0.5 rounded-md font-medium border border-stone-200/60 dark:border-stone-700">
                  <span>{bedrooms}+ {bedrooms === 1 ? 'quarto' : 'quartos'}</span>
                  <button
                    onClick={() => updatePillar('typology', { minBedrooms: 0 })}
                    aria-label="Remover filtro de quartos"
                    className="hover:text-accent ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Tipo */}
              {propertyType && propertyType !== 'Todos' && (
                <span className="inline-flex items-center gap-1 bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-2 py-0.5 rounded-md font-medium border border-stone-200/60 dark:border-stone-700">
                  <span>{propertyType}</span>
                  <button
                    onClick={() => updatePillar('typology', { propertyType: 'Todos' })}
                    aria-label="Remover filtro de tipologia"
                    className="hover:text-accent ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Bairros */}
              {neighborhoods.map(b => (
                <span key={b} className="inline-flex items-center gap-1 bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-2 py-0.5 rounded-md font-medium border border-stone-200/60 dark:border-stone-700">
                  <span>{b}</span>
                  <button
                    onClick={() => updatePillar('location', { neighborhoods: neighborhoods.filter(n => n !== b) })}
                    aria-label={`Remover bairro ${b}`}
                    className="hover:text-accent ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Comodidades */}
              {amenities.map(a => (
                <span key={a} className="inline-flex items-center gap-1 bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-2 py-0.5 rounded-md font-medium border border-stone-200/60 dark:border-stone-700">
                  <span>{a}</span>
                  <button
                    onClick={() => toggleAmenity(a)}
                    aria-label={`Remover comodidade ${a}`}
                    className="hover:text-accent ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Contagem Honesta de Imóveis e Ação de Editar (Ref. UX Tópicos 05 e 07) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xs text-stone-500 font-medium">
            <span className="font-bold text-stone-900 dark:text-stone-100">{properties.length}</span>
            <span> de {rawPropertiesCount} imóveis</span>
            {hasAnyFilter && (
              <span className="hidden md:inline text-stone-400 ml-1.5">
                ({activePillarsCount} de 4 pilares ativos)
              </span>
            )}
          </div>

          {hasAnyFilter && (
            <button
              onClick={resetProfile}
              aria-label="Limpar todos os filtros"
              className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 flex items-center gap-1 hover:underline"
              title="Limpar todos os filtros"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          )}

          <button
            onClick={onOpenDrawer}
            aria-label="Abrir painel lateral de edição completa"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors border border-stone-200 dark:border-stone-700"
          >
            Editar Filtros
          </button>
        </div>

      </div>
    </div>
  );
}
