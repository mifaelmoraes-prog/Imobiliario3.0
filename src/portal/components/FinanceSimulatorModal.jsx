import React, { useState } from 'react';
import { Modal } from '../../design-system/Modal';
import { Button } from '../../design-system/Button';
import { formatCurrencyBRL } from '../../design-system/SliderRange';
import { useBuyerProfile } from '../../context/BuyerProfileContext';
import { Calculator, Check, ArrowRight } from 'lucide-react';

export function FinanceSimulatorModal({ property, isOpen, onClose }) {
  const { profile, logActivity } = useBuyerProfile();

  const propertyPrice = property?.price || 1200000;
  const [downPayment, setDownPayment] = useState(propertyPrice * 0.2); // 20% de entrada padrão
  const [annualInterestRate, setAnnualInterestRate] = useState(10.5); // 10.5% a.a.
  const [termYears, setTermYears] = useState(30); // 30 anos (360 meses)
  const [system, setSystem] = useState('SAC'); // 'SAC' | 'PRICE'

  const loanAmount = Math.max(0, propertyPrice - downPayment);
  const totalMonths = termYears * 12;
  const monthlyRate = Math.pow(1 + annualInterestRate / 100, 1 / 12) - 1;

  // Cálculo SAC (Amortização Constante)
  const monthlyAmortizationSAC = loanAmount / totalMonths;
  const firstInstallmentSAC = monthlyAmortizationSAC + (loanAmount * monthlyRate);
  const lastInstallmentSAC = monthlyAmortizationSAC + (monthlyAmortizationSAC * monthlyRate);
  const totalPaidSAC = ((firstInstallmentSAC + lastInstallmentSAC) / 2) * totalMonths;

  // Cálculo PRICE (Parcelas Fixas)
  const installmentPRICE = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
  const totalPaidPRICE = installmentPRICE * totalMonths;

  const handleSaveSimulation = () => {
    logActivity('MORTGAGE_SIMULATION', `Simulação ${system} para ${property?.title || 'Imóvel'}: Entrada ${formatCurrencyBRL(downPayment)}, 1ª Parcela ${formatCurrencyBRL(system === 'SAC' ? firstInstallmentSAC : installmentPRICE)}`, {
      propertyId: property?.id,
      system,
      downPayment,
      termYears
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Simulador de Financiamento Multi-Banco"
      subtitle={`Imóvel: ${property?.title || 'Selecione um imóvel'} (${formatCurrencyBRL(propertyPrice)})`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">

        {/* Controles de Parâmetros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 dark:bg-stone-850 p-4 rounded-xl border border-stone-200 dark:border-stone-800">
          
          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Valor da Entrada (Mínimo 20%): {formatCurrencyBRL(downPayment)}
            </label>
            <input
              type="range"
              min={propertyPrice * 0.1}
              max={propertyPrice * 0.8}
              step={10000}
              value={downPayment}
              onChange={(e) => setDownPayment(Number(e.target.value))}
              className="w-full accent-accent cursor-pointer"
            />
            <span className="text-[11px] text-stone-500">
              Saldo financiado: {formatCurrencyBRL(loanAmount)}
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Prazo de Financiamento: {termYears} anos ({totalMonths} meses)
            </label>
            <input
              type="range"
              min={5}
              max={35}
              step={5}
              value={termYears}
              onChange={(e) => setTermYears(Number(e.target.value))}
              className="w-full accent-accent cursor-pointer"
            />
            <span className="text-[11px] text-stone-500">
              Taxa estimada: {annualInterestRate}% a.a.
            </span>
          </div>

        </div>

        {/* Seletor de Tabela SAC vs PRICE */}
        <div>
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-2">
            Sistema de Amortização
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSystem('SAC')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                system === 'SAC'
                  ? 'bg-accent/5 border-accent text-accent shadow-sm ring-1 ring-accent'
                  : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
              }`}
            >
              <div className="font-bold text-sm mb-0.5">Tabela SAC</div>
              <p className="text-xs text-stone-500">
                Parcelas decrescentes. Menor total de juros pagos ao longo do contrato.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSystem('PRICE')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                system === 'PRICE'
                  ? 'bg-accent/5 border-accent text-accent shadow-sm ring-1 ring-accent'
                  : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
              }`}
            >
              <div className="font-bold text-sm mb-0.5">Tabela PRICE</div>
              <p className="text-xs text-stone-500">
                Parcelas fixas do início ao fim. Maior previsibilidade orçamentária inicial.
              </p>
            </button>
          </div>
        </div>

        {/* Resumo dos Valores Calculados */}
        <div className="bg-stone-900 text-white p-5 rounded-2xl space-y-3">
          <div className="text-xs text-stone-400 font-medium uppercase tracking-wider">
            Resultado da Simulação ({system})
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <span className="text-xs text-stone-400 block">Primeira Parcela</span>
              <span className="text-xl sm:text-2xl font-extrabold text-white tabular-nums">
                {formatCurrencyBRL(system === 'SAC' ? firstInstallmentSAC : installmentPRICE)}
              </span>
            </div>

            <div>
              <span className="text-xs text-stone-400 block">Última Parcela</span>
              <span className="text-xl sm:text-2xl font-extrabold text-stone-300 tabular-nums">
                {formatCurrencyBRL(system === 'SAC' ? lastInstallmentSAC : installmentPRICE)}
              </span>
            </div>

            <div>
              <span className="text-xs text-stone-400 block">Total Financiado</span>
              <span className="text-xl sm:text-2xl font-extrabold text-stone-300 tabular-nums">
                {formatCurrencyBRL(system === 'SAC' ? totalPaidSAC : totalPaidPRICE)}
              </span>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
          >
            Fechar
          </button>
          <Button
            variant="primary"
            size="md"
            icon={Check}
            onClick={handleSaveSimulation}
          >
            Salvar no Perfil do Consultor
          </Button>
        </div>

      </div>
    </Modal>
  );
}
