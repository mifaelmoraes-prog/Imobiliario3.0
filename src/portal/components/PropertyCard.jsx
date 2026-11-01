import React from 'react';
import { Heart, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import { formatCurrencyBRL } from '../../design-system/SliderRange';

/**
 * Card de Imóvel Otimizado conforme a Auditoria de UX (Tópico 04 e US-04)
 * - Foto limpa (sem badge escura tapando a imagem)
 * - Selo de Match exibido apenas se houver perfil ativo com hover explicativo
 * - Specs em linha única com plural gramatical correto
 * - Preço com R$/m² e bairro abaixo do valor
 * - Link discreto "Analisar pré-requisitos →" no rodapé
 */
export function PropertyCard({
  property,
  isFavorite = false,
  onToggleFavorite,
  onSelectProperty,
  onAnalyzePrerequisites
}) {
  const {
    id,
    title,
    price = 0,
    pricePerM2,
    neighborhood,
    city,
    bedrooms = 0,
    parking = 0,
    bathrooms = 0,
    area = 0,
    images,
    image,
    matchScore,
    matchDetails
  } = property;

  const coverImage = images?.hero || image || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80';
  const calculatedM2 = pricePerM2 || (area > 0 && price > 0 ? Math.round(price / area) : null);

  const formatSpecs = () => {
    const parts = [];
    if (area > 0) parts.push(`${area} m²`);
    if (bedrooms > 0) parts.push(`${bedrooms} ${bedrooms === 1 ? 'quarto' : 'quartos'}`);
    if (parking > 0) parts.push(`${parking} ${parking === 1 ? 'vaga' : 'vagas'}`);
    if (bathrooms > 0) parts.push(`${bathrooms} ${bathrooms === 1 ? 'banheiro' : 'banheiros'}`);
    return parts.join(' · ');
  };

  const hasMatchScore = matchScore !== null && matchScore !== undefined && matchScore > 0;

  return (
    <article className="group bg-white dark:bg-stone-850 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col overflow-hidden">
      
      {/* Imagem do Imóvel com Badges Limpas */}
      <div className="relative aspect-[16/10] overflow-hidden bg-stone-100 dark:bg-stone-800 cursor-pointer" onClick={() => onSelectProperty(property)}>
        <img
          src={coverImage}
          alt={title || 'Foto do imóvel'}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80';
          }}
        />

        {/* Gradiente sutil para legibilidade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 pointer-events-none" />

        {/* Selo Match Explicável (Exibido apenas se houver perfil ativo - GAP-04.1) */}
        {hasMatchScore && (
          <div 
            className="absolute top-3 left-3 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-accent shadow-sm flex items-center gap-1 border border-stone-200/50"
            title={matchDetails?.whyMatches?.slice(0, 2).join(' · ') || 'Compatibilidade com seu perfil'}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Match {matchScore}%</span>
          </div>
        )}

        {/* Botão de Favoritar Acessível (44x44px) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(id);
          }}
          aria-label={isFavorite ? "Remover dos favoritos" : "Salvar imóvel nos favoritos"}
          className={`absolute top-3 right-3 w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-sm ${
            isFavorite
              ? 'bg-rose-500 text-white'
              : 'bg-white/80 dark:bg-stone-900/80 text-stone-700 dark:text-stone-200 hover:bg-white hover:text-rose-500'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Conteúdo do Card */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="cursor-pointer" onClick={() => onSelectProperty(property)}>
          
          {/* Preço e R$/m² (Ref. UX Tópico 04 / GAP-04.3) */}
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-xl font-bold text-stone-900 dark:text-white tabular-nums">
              {formatCurrencyBRL(price)}
            </span>
            {calculatedM2 && (
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400 tabular-nums">
                R$ {calculatedM2.toLocaleString('pt-BR')}/m²
              </span>
            )}
          </div>

          {/* Bairro posicionado abaixo do valor com alto contraste */}
          <div className="flex items-center gap-1 text-xs font-medium text-stone-600 dark:text-stone-300 mb-3">
            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="truncate">{neighborhood || 'Localização nobre'}{city ? ` · ${city.split('-')[0].trim()}` : ''}</span>
          </div>

          {/* Specs em Linha Única de Texto Neutro com Plural Correto (GAP-04.2) */}
          <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mb-3">
            {formatSpecs()}
          </p>

          {/* Título Resumido */}
          <h3 className="text-xs font-medium text-stone-700 dark:text-stone-300 line-clamp-1 mb-3">
            {title}
          </h3>
        </div>

        {/* Rodapé com Link Discreto de Pré-Requisitos (GAP-04.1 / Ref. UX Tópico 04) */}
        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => onAnalyzePrerequisites(property)}
            className="text-stone-500 hover:text-accent font-medium flex items-center gap-1 group/link transition-colors"
          >
            <span>Analisar pré-requisitos</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => onSelectProperty(property)}
            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            Ver detalhes
          </button>
        </div>

      </div>
    </article>
  );
}
