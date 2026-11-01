import React, { useMemo } from 'react';
import { formatCurrencyBRL } from '../../design-system/SliderRange';
import { DataTruthBadge } from '../../design-system/DataTruthBadge';
import { Button } from '../../design-system/Button';
import { 
  ArrowLeft, 
  MessageSquare, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  DollarSign 
} from 'lucide-react';

export function PropertyBuyersView({ property, onBack }) {
  if (!property) return null;

  // Mock de Compradores Candidatos da Carteira BIH
  const candidates = useMemo(() => [
    {
      id: 'cand-1',
      name: 'Carlos Eduardo Silveira',
      phone: '(41) 98823-1100',
      dataState: 'DECLARED',
      verificationState: 'VERIFIED',
      budget: property.price * 1.05,
      desiredNeighborhood: property.neighborhood,
      bedroomsDesired: property.bedrooms || 3,
      whyMatches: [
        'Orçamento aprovado compatível com o imóvel',
        `Busca exatamente pelo bairro ${property.neighborhood}`,
        `Deseja ${property.bedrooms} quartos`
      ],
      whyNot: [],
      missingInfo: ['Aguardando envio do comprovante de residência atualizado'],
      matchScore: 94
    },
    {
      id: 'cand-2',
      name: 'Mariana Duarte',
      phone: '(41) 99120-4455',
      dataState: 'OBSERVED',
      verificationState: 'NOT_VERIFIED',
      budget: property.price * 0.98,
      desiredNeighborhood: property.neighborhood,
      bedroomsDesired: property.bedrooms || 3,
      whyMatches: [
        'Navegou 4 vezes por anúncios similares neste condomínio',
        'Favoritou imóvel com tipologia idêntica'
      ],
      whyNot: ['Orçamento declarado ligeiramente no limite da margem'],
      missingInfo: ['Não possui simulação bancária anexada'],
      matchScore: 86
    },
    {
      id: 'cand-3',
      name: 'Felipe e Renata Fontes',
      phone: '(41) 99877-3322',
      dataState: 'INFERRED',
      verificationState: 'NOT_VERIFIED',
      budget: property.price * 1.15,
      desiredNeighborhood: 'Batel / Ecoville',
      bedroomsDesired: property.bedrooms || 3,
      whyMatches: [
        'Capacidade de crédito pré-aprovada de até R$ 3.5M',
        'Interesse ativo em imóveis com varanda gourmet'
      ],
      whyNot: ['Prefere andar alto com sol da tarde'],
      missingInfo: ['Necessidade de vaga extra não confirmada'],
      matchScore: 79
    }
  ], [property]);

  const handleSendPitch = (cand) => {
    const text = encodeURIComponent(
      `Olá ${cand.name}! Aqui é da Urban Real State. Encontrei uma excelente oportunidade perfeitamente compatível com o seu perfil de busca: "${property.title}" no bairro ${property.neighborhood} (${formatCurrencyBRL(property.price)}). Podemos agendar uma visita exclusiva?`
    );
    window.open(`https://wa.me/55${cand.phone.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Barra Superior de Retorno */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Gestão de Estoque</span>
        </button>

        <span className="text-xs font-bold text-accent">
          Match Inverso de Vendas (P0-1 BIH)
        </span>
      </div>

      {/* Cartão do Imóvel Selecionado */}
      <div className="bg-white dark:bg-stone-850 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={property.images?.hero || property.image || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=300&q=80'}
            alt={property.title}
            className="w-20 h-16 object-cover rounded-xl shrink-0 border border-stone-200"
          />
          <div>
            <span className="text-xs font-bold text-accent uppercase tracking-wider block">
              Imóvel Selecionado para Cruzamento
            </span>
            <h2 className="text-base font-bold text-stone-900 dark:text-white leading-snug">
              {property.title}
            </h2>
            <div className="text-xs text-stone-500 mt-0.5">
              {property.neighborhood}, {property.city} · {property.area} m² · {property.bedrooms} quartos
            </div>
          </div>
        </div>

        <div className="sm:text-right shrink-0">
          <div className="text-xl font-extrabold text-stone-900 dark:text-white tabular-nums">
            {formatCurrencyBRL(property.price)}
          </div>
          <span className="text-xs text-emerald-600 font-bold block mt-0.5">
            {candidates.length} compradores com alta aderência
          </span>
        </div>
      </div>

      {/* Lista de Compradores Compatíveis */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-stone-800 dark:text-white uppercase tracking-wider">
          Compradores com Fit Real Encontrados na Carteira
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {candidates.map((cand) => (
            <div
              key={cand.id}
              className="bg-white dark:bg-stone-850 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-card hover:shadow-card-hover transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                
                {/* Header do Comprador com Selo BIH */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-stone-900 dark:text-white">
                    {cand.name}
                  </span>
                  <span className="text-xs text-stone-500">
                    {cand.phone}
                  </span>
                  {/* Higiene da Verdade BIH (GAP-07.2 e P0-2) */}
                  <DataTruthBadge
                    dataState={cand.dataState}
                    verificationState={cand.verificationState}
                  />
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-accent text-white shadow-xs">
                    Match {cand.matchScore}%
                  </span>
                </div>

                {/* Explicabilidade do Match em 5D */}
                <div className="space-y-1 text-xs pt-1">
                  {cand.whyMatches.map((msg, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{msg}</span>
                    </div>
                  ))}

                  {cand.whyNot.map((msg, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{msg}</span>
                    </div>
                  ))}
                </div>

              </div>

              {/* Botão de Disparo do Pitch via WhatsApp */}
              <div className="shrink-0 flex items-center gap-2">
                <Button
                  variant="primary"
                  size="md"
                  icon={MessageSquare}
                  onClick={() => handleSendPitch(cand)}
                >
                  Disparar Pitch no WhatsApp
                </Button>
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
