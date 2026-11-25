import React, { useState } from 'react';
import { PropertyCard } from './PropertyCard';
import { ArrowUpDown, SearchX, Info } from 'lucide-react';
import { ViewModeToggle } from './ViewModeToggle';
import { useProperties } from '../../context/PropertyContext';
import { useBuyerProfile } from '../../context/BuyerProfileContext';

export function PropertyGrid({
  onSelectProperty,
  onAnalyzePrerequisites,
  onOpenDrawer
}) {
  const {
    properties,
    searchNotice,
    favorites,
    toggleFavorite,
    sortOrder,
    setSortOrder
  } = useProperties();

  const { resetProfile } = useBuyerProfile();
  const [visibleCount, setVisibleCount] = useState(12);

  const displayedProperties = properties.slice(0, visibleCount);
  const hasMore = visibleCount < properties.length;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      
      {/* Aviso da busca por frase: só venda, ou região sem imóveis com opções parecidas */}
      {searchNotice && (
        <div role="status" className="mb-4 flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/5 dark:bg-accent/10 px-4 py-3 text-sm text-stone-800 dark:text-stone-100">
          <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
          <p>{searchNotice}</p>
        </div>
      )}

      {/* Barra de Controles e Ordenação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pt-2">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-500 font-medium">
          <span>Mostrando</span>
          <span className="font-bold text-stone-900 dark:text-stone-100">{displayedProperties.length}</span>
          <span>de</span>
          <span className="font-bold text-stone-900 dark:text-stone-100">{properties.length}</span>
          <span>imóveis selecionados</span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 self-end sm:self-auto">
          {/* Alternador de Ordenação */}
          <div className="relative flex items-center bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 rounded-lg px-2.5 py-1.5 shadow-sm text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400 mr-1.5" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              aria-label="Ordenar imóveis"
              className="bg-transparent text-stone-700 dark:text-stone-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="match_desc">Maior Compatibilidade (Match)</option>
              <option value="price_asc">Menor Preço</option>
              <option value="price_desc">Maior Preço</option>
              <option value="area_desc">Maior Área</option>
            </select>
          </div>

          {/* Alternador Lista / Mapa (também aparece na tela do mapa) */}
          <ViewModeToggle />
        </div>
      </div>

      {/* Estado Vazio Amigável */}
      {properties.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-stone-850 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 p-8 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto text-stone-400 mb-4">
            <SearchX className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-stone-900 dark:text-white mb-1">
            Nenhum imóvel encontrado para essa combinação
          </h3>
          <p className="text-xs sm:text-sm text-stone-500 mb-6">
            Tente elevar o teto orçamentário, remover um bairro ou redefinir os filtros.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={resetProfile}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-200 transition-colors"
            >
              Limpar Filtros
            </button>
            <button
              onClick={onOpenDrawer}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              Ajustar Orçamento
            </button>
          </div>
        </div>
      ) : (
        /* Grade de Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayedProperties.map((property, index) => (
            <PropertyCard
              key={property.id}
              property={property}
              priority={index < 2}
              isFavorite={favorites.includes(property.id)}
              onToggleFavorite={toggleFavorite}
              onSelectProperty={onSelectProperty}
              onAnalyzePrerequisites={onAnalyzePrerequisites}
            />
          ))}
        </div>
      )}

      {/* Botão Carregar Mais */}
      {hasMore && (
        <div className="text-center mt-12">
          <button
            onClick={() => setVisibleCount((prev) => prev + 12)}
            className="px-6 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-800 dark:text-stone-200 text-sm font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 shadow-sm hover:shadow transition-all"
          >
            Carregar Mais Imóveis (+12)
          </button>
        </div>
      )}

    </section>
  );
}

