import React from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  ArrowUpRight, 
  MessageSquare, 
  CheckCircle2, 
  Eye, 
  Heart, 
  Calculator, 
  ShieldCheck 
} from 'lucide-react';
import { formatCurrencyBRL } from '../../design-system/SliderRange';
import { useBuyerProfile } from '../../context/BuyerProfileContext';
import { useProperties } from '../../context/PropertyContext';
import { Button } from '../../design-system/Button';

export function RevenueHome({ onNavigateTab }) {
  const { timeline, profile } = useBuyerProfile();
  const { properties } = useProperties();

  // Métricas executivas consolidadas
  const vgvTotal = 28450000;
  const comissaoProjetada = vgvTotal * 0.05; // 5% de honorários médios
  const leadsAtivos = 42;
  const taxaConversao = 14.8;

  // Worklist: Imóveis parados ou leads com alto fit sem contato há mais de 48h
  const highFitLeads = [
    {
      id: 'lead-1',
      name: profile.metadata?.leadName || 'Carlos Eduardo Silveira',
      phone: profile.metadata?.leadPhone || '(41) 98823-1100',
      fitScore: 92,
      propertyInterest: 'Apartamento Batel 3 Quartos',
      budget: 'R$ 2.400.000',
      lastAction: 'Análise de Pré-Requisitos feita há 2h',
      status: 'Aguardando Contato',
      isHot: true
    },
    {
      id: 'lead-2',
      name: 'Mariana Guimarães',
      phone: '(41) 99120-4455',
      fitScore: 88,
      propertyInterest: 'Cobertura Duplex Ecoville',
      budget: 'R$ 4.500.000',
      lastAction: 'Simulação SAC 30 anos realizada',
      status: 'Aguardando Envio de Proposta',
      isHot: true
    },
    {
      id: 'lead-3',
      name: 'Roberto Valente',
      phone: '(11) 97744-8899',
      fitScore: 81,
      propertyInterest: 'Casa Residencial Jardim Europa',
      budget: 'R$ 3.800.000',
      lastAction: 'Crítica: Solicitou 4+ vagas',
      status: 'Recalibrar Carteira',
      isHot: false
    }
  ];

  return (
    <div className="space-y-6">

      {/* Cabeçalho da Torre de Controle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
            Revenue Home — Torre de Controle Executiva
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Acompanhamento em tempo real de VGV, honorários projetados e atividade dos compradores
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigateTab('pipeline')}
            icon={ArrowUpRight}
            iconPosition="right"
          >
            Ver Funil Kanban
          </Button>
        </div>
      </div>

      {/* 4 Cards de KPIs de Receita */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-stone-850 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-card">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">VGV em Negociação</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-stone-900 dark:text-white tabular-nums">
            {formatCurrencyBRL(vgvTotal)}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
            <span>↑ +18.4% este mês</span>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-850 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-card">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Honorários Projetados</span>
            <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-stone-900 dark:text-white tabular-nums">
            {formatCurrencyBRL(comissaoProjetada)}
          </div>
          <div className="text-[11px] text-stone-400 font-medium mt-1">
            Média de 5% de corretagem
          </div>
        </div>

        <div className="bg-white dark:bg-stone-850 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-card">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Leads Qualificados</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-stone-900 dark:text-white tabular-nums">
            {leadsAtivos}
          </div>
          <div className="text-[11px] text-stone-400 font-medium mt-1">
            Speed-to-lead médio: 8 min
          </div>
        </div>

        <div className="bg-white dark:bg-stone-850 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-card">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Taxa de Conversão</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-stone-900 dark:text-white tabular-nums">
            {taxaConversao}%
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            +3.2% acima do benchmark
          </div>
        </div>

      </div>

      {/* Grid: Worklist Priorizada (Esquerda) + Timeline em Tempo Real (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Worklist Priorizada de Ações Imediatas (7 colunas) */}
        <div className="lg:col-span-7 bg-white dark:bg-stone-850 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-white">
                Fila de Ação Prioritária (High-Fit Buyers)
              </h2>
              <p className="text-xs text-stone-500">
                Oportunidades com match &gt; 80% requerendo próximo passo do consultor
              </p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 border border-rose-200">
              {highFitLeads.length} urgências
            </span>
          </div>

          <div className="space-y-3">
            {highFitLeads.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-700/80 bg-stone-50/50 dark:bg-stone-800/40 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-stone-900 dark:text-white">
                      {item.name}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-accent text-white">
                      Match {item.fitScore}%
                    </span>
                  </div>
                  <div className="text-xs text-stone-600 dark:text-stone-300">
                    Interesse: <span className="font-medium text-stone-900 dark:text-white">{item.propertyInterest}</span> ({item.budget})
                  </div>
                  <div className="text-[11px] text-stone-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{item.lastAction}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`https://wa.me/55${item.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${item.name}, sou seu consultor na Urban Real State. Vi seu interesse no ${item.propertyInterest} e preparei uma apresentação exclusiva.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline de Eventos Reais do Comprador no Portal Público (5 colunas - GAP-07.3) */}
        <div className="lg:col-span-5 bg-white dark:bg-stone-850 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-card p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-white">
                  Timeline de Eventos do Comprador
                </h2>
                <p className="text-xs text-stone-500">
                  Ações navegacionais em tempo real no portal público
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                Ao Vivo
              </span>
            </div>

            <div className="space-y-3 mt-3 max-h-[420px] overflow-y-auto pr-1">
              {timeline.length === 0 ? (
                <div className="text-center py-8 text-xs text-stone-400 italic">
                  Nenhum evento registrado ainda. Navegue pelos imóveis ou use o Concierge para ver os eventos gerados aqui.
                </div>
              ) : (
                timeline.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 text-xs p-2.5 rounded-xl bg-stone-50/70 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800"
                  >
                    <div className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
                      {act.type === 'FAVORITE' && <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />}
                      {act.type === 'MORTGAGE_SIMULATION' && <Calculator className="w-3.5 h-3.5 text-blue-500" />}
                      {act.type === 'PREREQUISITES_ANALYSIS' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                      {act.type === 'PROFILE_UPDATE' && <CheckCircle2 className="w-3.5 h-3.5 text-accent" />}
                      {act.type === 'CONCIERGE_INTERACTION' && <MessageSquare className="w-3.5 h-3.5 text-accent" />}
                      {act.type === 'DOSSIER_DOWNLOAD' && <TrendingUp className="w-3.5 h-3.5 text-purple-500" />}
                      {!['FAVORITE', 'MORTGAGE_SIMULATION', 'PREREQUISITES_ANALYSIS', 'PROFILE_UPDATE', 'CONCIERGE_INTERACTION', 'DOSSIER_DOWNLOAD'].includes(act.type) && (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-stone-900 dark:text-stone-100 leading-snug">
                        {act.description}
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        {act.timeFormatted} · Evento do Portal Público
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-500 text-center">
            Sincronização bidirecional entre Portal Público e CRM ativa.
          </div>
        </div>

      </div>

    </div>
  );
}
