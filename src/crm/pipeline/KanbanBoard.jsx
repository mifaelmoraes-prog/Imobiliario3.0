import React, { useState } from 'react';
import { formatCurrencyBRL } from '../../design-system/SliderRange';
import { 
  Plus, 
  MessageSquare, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Button } from '../../design-system/Button';

const PIPELINE_STAGES = [
  { id: 'novo', title: '1. Novo Lead', color: 'border-blue-500' },
  { id: 'contato', title: '2. Primeiro Contato', color: 'border-indigo-500' },
  { id: 'qualificacao', title: '3. Qualificação 3D', color: 'border-amber-500' },
  { id: 'match', title: '4. Match Realizado', color: 'border-purple-500' },
  { id: 'visita', title: '5. Visita Agendada', color: 'border-cyan-500' },
  { id: 'proposta', title: '6. Proposta em Negociação', color: 'border-orange-500' },
  { id: 'ganho', title: '7. Fechado / Ganho', color: 'border-emerald-500' }
];

const INITIAL_OPPORTUNITIES = [
  {
    id: 'opp-1',
    leadName: 'Carlos Eduardo Silveira',
    phone: '(41) 98823-1100',
    propertyTitle: 'Apartamento Batel 3 Quartos',
    price: 2450000,
    stage: 'visita',
    daysInStage: 2,
    matchScore: 92,
    stale: false,
    nextStep: 'Confirmar horário da visita de sábado'
  },
  {
    id: 'opp-2',
    leadName: 'Patrícia Alencar',
    phone: '(41) 99233-4411',
    propertyTitle: 'Cobertura Duplex Ecoville',
    price: 4200000,
    stage: 'proposta',
    daysInStage: 3,
    matchScore: 89,
    stale: false,
    nextStep: 'Aguardando aprovação de pasta Caixa'
  },
  {
    id: 'opp-3',
    leadName: 'Dr. Fernando Peixoto',
    phone: '(41) 98711-2233',
    propertyTitle: 'Casa Residencial Graciosa',
    price: 3600000,
    stage: 'qualificacao',
    daysInStage: 6,
    matchScore: 84,
    stale: true, // Alerta de estagnação (> 5 dias sem contato)
    nextStep: 'Disparar WhatsApp de reengajamento'
  },
  {
    id: 'opp-4',
    leadName: 'Juliana e Renato',
    phone: '(41) 99888-7766',
    propertyTitle: 'Apartamento Juvevê Sol da Manhã',
    price: 1850000,
    stage: 'match',
    daysInStage: 1,
    matchScore: 95,
    stale: false,
    nextStep: 'Apresentar dossier das 3 unidades'
  },
  {
    id: 'opp-5',
    leadName: 'Mariana Duarte',
    phone: '(41) 99111-0022',
    propertyTitle: 'Residencial Champagnat',
    price: 1550000,
    stage: 'ganho',
    daysInStage: 12,
    matchScore: 98,
    stale: false,
    nextStep: 'Escritura assinada / Honorários faturados'
  }
];

export function KanbanBoard() {
  const [opportunities, setOpportunities] = useState(INITIAL_OPPORTUNITIES);

  const moveOpportunity = (oppId, direction) => {
    setOpportunities(prev => prev.map(opp => {
      if (opp.id !== oppId) return opp;
      const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === opp.stage);
      const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      if (newIndex >= 0 && newIndex < PIPELINE_STAGES.length) {
        return {
          ...opp,
          stage: PIPELINE_STAGES[newIndex].id,
          daysInStage: 0,
          stale: false
        };
      }
      return opp;
    }));
  };

  const handleSendPitch = (opp) => {
    const message = encodeURIComponent(
      `Olá ${opp.leadName}! Aqui é seu consultor na Urban Real State. Selecionei o imóvel "${opp.propertyTitle}" com índice de compatibilidade de ${opp.matchScore}% com seu perfil de busca. Podemos agendar uma visita exclusiva?`
    );
    window.open(`https://wa.me/55${opp.phone.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-4">
      
      {/* Header do Kanban */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
            Pipeline de Vendas Kanban (7 Estágios)
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Acompanhe a evolução de cada oportunidade comercial com alertas de estagnação de 5 dias
          </p>
        </div>
      </div>

      {/* Grade de Colunas do Kanban com Rolagem Horizontal Suave */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-2">
        {PIPELINE_STAGES.map((stage, stageIndex) => {
          const stageOpps = opportunities.filter(o => o.stage === stage.id);
          const stageVgv = stageOpps.reduce((acc, curr) => acc + curr.price, 0);

          return (
            <div
              key={stage.id}
              className="w-80 shrink-0 bg-stone-100/70 dark:bg-stone-850 rounded-2xl p-3 border border-stone-200/80 dark:border-stone-800 flex flex-col max-h-[750px]"
            >
              {/* Topo da Coluna */}
              <div className="pb-3 border-b border-stone-200 dark:border-stone-700/80 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                    {stage.title}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 shadow-xs">
                    {stageOpps.length}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-accent mt-1 tabular-nums">
                  VGV: {formatCurrencyBRL(stageVgv)}
                </div>
              </div>

              {/* Lista de Cards da Coluna */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {stageOpps.map((opp) => (
                  <div
                    key={opp.id}
                    className={`bg-white dark:bg-stone-800 rounded-xl p-3.5 border shadow-card hover:shadow-card-hover transition-all ${
                      opp.stale
                        ? 'border-rose-400 bg-rose-50/20'
                        : 'border-stone-200/90 dark:border-stone-700'
                    }`}
                  >
                    {/* Alerta de Estagnação (US-13) */}
                    {opp.stale && (
                      <div className="mb-2 p-1.5 rounded-md bg-rose-100/80 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Estagnado há {opp.daysInStage} dias (SLA estourado)</span>
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <h4 className="text-xs font-bold text-stone-900 dark:text-white leading-tight">
                        {opp.leadName}
                      </h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent/10 text-accent shrink-0">
                        Match {opp.matchScore}%
                      </span>
                    </div>

                    <div className="text-xs text-stone-600 dark:text-stone-300 mb-2 truncate">
                      {opp.propertyTitle}
                    </div>

                    <div className="text-sm font-extrabold text-stone-900 dark:text-white tabular-nums mb-3">
                      {formatCurrencyBRL(opp.price)}
                    </div>

                    <div className="text-[11px] text-stone-500 bg-stone-50 dark:bg-stone-750 p-2 rounded-lg mb-3">
                      <span className="font-semibold block text-stone-700 dark:text-stone-300">Próximo Passo:</span>
                      {opp.nextStep}
                    </div>

                    {/* Controles de Ação do Card */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-700">
                      <button
                        onClick={() => handleSendPitch(opp)}
                        aria-label={`Enviar WhatsApp para ${opp.leadName}`}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        title="Enviar pitch pré-formatado no WhatsApp"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Pitch WA</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {stageIndex > 0 && (
                          <button
                            onClick={() => moveOpportunity(opp.id, 'prev')}
                            aria-label="Mover para fase anterior"
                            className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700"
                            title="Voltar etapa"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        )}
                        {stageIndex < PIPELINE_STAGES.length - 1 && (
                          <button
                            onClick={() => moveOpportunity(opp.id, 'next')}
                            aria-label="Mover para próxima fase"
                            className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700"
                            title="Avançar etapa"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                ))}

                {stageOpps.length === 0 && (
                  <div className="text-center py-8 text-xs text-stone-400 italic">
                    Nenhuma oportunidade nesta fase.
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

