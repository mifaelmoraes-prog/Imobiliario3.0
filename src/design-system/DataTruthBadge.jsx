import React from 'react';
import { UserCheck, Eye, Cpu, TestTube, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Selo de Higiene da Verdade e Governança BIH V0
 * Diferencia dados DECLARADOS, OBSERVADOS, INFERIDOS e SIMULADOS, além da checagem documental.
 */
export function DataTruthBadge({
  dataState = 'DECLARED',           // 'DECLARED' | 'OBSERVED' | 'INFERRED' | 'SIMULATED'
  verificationState = 'UNVERIFIED', // 'VERIFIED' | 'NOT_VERIFIED' | 'UNVERIFIED'
  size = 'sm',                      // 'sm' | 'md'
  showVerification = true,
  className = ''
}) {
  const configs = {
    DECLARED: {
      label: 'Declarado',
      icon: UserCheck,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40',
      tooltip: 'Informado diretamente pelo comprador'
    },
    OBSERVED: {
      label: 'Observado',
      icon: Eye,
      color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40',
      tooltip: 'Capturado pelo histórico de navegação no portal'
    },
    INFERRED: {
      label: 'Inferido por IA',
      icon: Cpu,
      color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40',
      tooltip: 'Estimativa algorítmica preditiva'
    },
    SIMULATED: {
      label: 'Demonstração',
      icon: TestTube,
      color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/40',
      tooltip: 'Massa de dados simulada para teste'
    }
  };

  const current = configs[dataState] || configs.DECLARED;
  const StateIcon = current.icon;
  const isVerified = verificationState === 'VERIFIED';

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`} title={current.tooltip}>
      <span className={`inline-flex items-center gap-1 font-medium rounded-full border px-2 py-0.5 ${size === 'sm' ? 'text-[11px]' : 'text-xs'} ${current.color}`}>
        <StateIcon className="w-3 h-3 shrink-0" />
        <span>{current.label}</span>
      </span>

      {showVerification && (
        <span 
          className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${isVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400 dark:text-stone-500'}`}
          title={isVerified ? 'Checado e validado com documento' : 'Não verificado documentalmente'}
        >
          {isVerified ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Verificado</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3" />
              <span>Não verificado</span>
            </>
          )}
        </span>
      )}
    </div>
  );
}
