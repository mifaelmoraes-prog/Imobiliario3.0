import React, { useState } from 'react';
import { Modal } from '../../design-system/Modal';
import { Button } from '../../design-system/Button';
import { formatCurrencyBRL } from '../../design-system/SliderRange';
import { useBuyerProfile } from '../../context/BuyerProfileContext';
import { CheckCircle2, AlertCircle, FileCheck, ShieldCheck, ArrowRight } from 'lucide-react';

export function PrerequisitesModal({ property, isOpen, onClose, onOpenWhatsApp }) {
  const { profile, logActivity } = useBuyerProfile();

  if (!property) return null;

  const price = property.price || 0;
  const minEntryRequired = price * 0.20;
  const estimatedIncomeRequired = (price * 0.80 * 0.0105) / 0.30; // Comprometimento máximo de 30% da renda

  const handleConsultantContact = () => {
    logActivity('PREREQUISITES_ANALYSIS', `Análise de pré-requisitos solicitada para ${property.title}`);
    if (onOpenWhatsApp) onOpenWhatsApp(property);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Análise de Pré-Requisitos e Elegibilidade"
      subtitle={`Avaliação prévia para aquisição de: ${property.title}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-5">
        
        {/* Bloco de Estimativas */}
        <div className="bg-stone-50 dark:bg-stone-850 p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200/60 dark:border-stone-700/60 text-xs">
            <span className="text-stone-500">Valor do Imóvel:</span>
            <span className="font-bold text-stone-900 dark:text-white tabular-nums">
              {formatCurrencyBRL(price)}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-stone-200/60 dark:border-stone-700/60 text-xs">
            <span className="text-stone-500">Entrada Mínima Sugerida (20%):</span>
            <span className="font-bold text-accent tabular-nums">
              {formatCurrencyBRL(minEntryRequired)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-500">Renda Familiar Bruta Recomendada:</span>
            <span className="font-bold text-stone-900 dark:text-white tabular-nums">
              ~ {formatCurrencyBRL(estimatedIncomeRequired)}/mês
            </span>
          </div>
        </div>

        {/* Checklist Documental */}
        <div>
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-2.5">
            Checklist de Documentos para Pasta Bancária
          </span>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2 text-stone-700 dark:text-stone-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Documento oficial de identificação (RG / CNH) e CPF regularizado</span>
            </div>
            <div className="flex items-start gap-2 text-stone-700 dark:text-stone-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Comprovante de residência atualizado (últimos 60 dias)</span>
            </div>
            <div className="flex items-start gap-2 text-stone-700 dark:text-stone-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Comprovação de renda (Holerites recentes / Extratos / Declaração de IR)</span>
            </div>
            <div className="flex items-start gap-2 text-stone-700 dark:text-stone-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Certidão de estado civil e extrato do FGTS (se for utilizar)</span>
            </div>
          </div>
        </div>

        {/* Aviso de Transparência */}
        <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            Nenhum dado financeiro sensível é exigido nesta etapa. Nosso consultor pode realizar uma pré-análise bancária gratuita com todas as instituições integradas.
          </span>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-500 hover:text-stone-800"
          >
            Fechar
          </button>
          <Button
            variant="primary"
            size="md"
            icon={ArrowRight}
            iconPosition="right"
            onClick={handleConsultantContact}
          >
            Validar com Consultor
          </Button>
        </div>

      </div>
    </Modal>
  );
}
