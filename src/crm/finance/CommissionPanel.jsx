import React, { useState } from 'react';
import { formatCurrencyBRL } from '../../design-system/SliderRange';
import { DollarSign, CheckCircle2, Clock, Users, ArrowUpRight } from 'lucide-react';

const RECENT_COMMISSIONS = [
  {
    id: 'com-1',
    propertyTitle: 'Apartamento Batel Duplex',
    soldPrice: 2850000,
    totalFee: 171000, // 6%
    captadorName: 'Ricardo Mendes',
    captadorFee: 68400, // 40%
    vendedorName: 'Ana Paula Rocha',
    vendedorFee: 68400, // 40%
    imobiliariaFee: 34200, // 20%
    status: 'Faturado',
    date: '28/10/2026'
  },
  {
    id: 'com-2',
    propertyTitle: 'Cobertura Ecoville',
    soldPrice: 4100000,
    totalFee: 246000,
    captadorName: 'Mariana Duarte',
    captadorFee: 98400,
    vendedorName: 'Ricardo Mendes',
    vendedorFee: 98400,
    imobiliariaFee: 49200,
    status: 'Em Análise',
    date: '22/10/2026'
  },
  {
    id: 'com-3',
    propertyTitle: 'Residencial Graciosa',
    soldPrice: 1950000,
    totalFee: 117000,
    captadorName: 'Carlos Silveira',
    captadorFee: 46800,
    vendedorName: 'Carlos Silveira', // Fechamento direto 80%
    vendedorFee: 46800,
    imobiliariaFee: 23400,
    status: 'Pago',
    date: '15/10/2026'
  }
];

export function CommissionPanel() {
  const totalFaturado = RECENT_COMMISSIONS.reduce((a, b) => a + b.totalFee, 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
          Gestão de Comissões & Divisão de Honorários (Splits)
        </h1>
        <p className="text-xs sm:text-sm text-stone-500">
          Controle automático da regra padrão de corretagem (40% Captador · 40% Fechamento · 20% Imobiliária)
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-stone-850 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-card">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
            Total de Honorários (Mês)
          </span>
          <div className="text-2xl font-extrabold text-stone-900 dark:text-white tabular-nums">
            {formatCurrencyBRL(totalFaturado)}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">3 operações concluídas</span>
        </div>

        <div className="bg-white dark:bg-stone-850 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-card">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
            Repassado aos Consultores
          </span>
          <div className="text-2xl font-extrabold text-accent tabular-nums">
            {formatCurrencyBRL(totalFaturado * 0.8)}
          </div>
          <span className="text-[11px] text-stone-400 font-medium">80% do montante total</span>
        </div>

        <div className="bg-white dark:bg-stone-850 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-card">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
            Retenção Imobiliária
          </span>
          <div className="text-2xl font-extrabold text-stone-900 dark:text-white tabular-nums">
            {formatCurrencyBRL(totalFaturado * 0.2)}
          </div>
          <span className="text-[11px] text-stone-400 font-medium">20% de margem operacional</span>
        </div>
      </div>

      {/* Tabela de Comissões Recentes */}
      <div className="bg-white dark:bg-stone-850 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-card overflow-hidden">
        <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900 dark:text-white">
            Demonstrativo de Splits por Negociação
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-700/80 text-stone-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="p-3.5">Imóvel Negociado</th>
                <th className="p-3.5">Valor Venda</th>
                <th className="p-3.5">Honorário 6%</th>
                <th className="p-3.5">Captador (40%)</th>
                <th className="p-3.5">Vendedor (40%)</th>
                <th className="p-3.5">Imobiliária (20%)</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {RECENT_COMMISSIONS.map((item) => (
                <tr key={item.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-stone-900 dark:text-white">{item.propertyTitle}</div>
                    <div className="text-[10px] text-stone-400">{item.date}</div>
                  </td>
                  <td className="p-3.5 font-semibold text-stone-800 dark:text-stone-200 tabular-nums">
                    {formatCurrencyBRL(item.soldPrice)}
                  </td>
                  <td className="p-3.5 font-bold text-stone-900 dark:text-white tabular-nums">
                    {formatCurrencyBRL(item.totalFee)}
                  </td>
                  <td className="p-3.5 text-stone-700 dark:text-stone-300">
                    <span className="font-medium">{item.captadorName}</span>
                    <div className="text-[11px] text-accent font-bold tabular-nums">{formatCurrencyBRL(item.captadorFee)}</div>
                  </td>
                  <td className="p-3.5 text-stone-700 dark:text-stone-300">
                    <span className="font-medium">{item.vendedorName}</span>
                    <div className="text-[11px] text-accent font-bold tabular-nums">{formatCurrencyBRL(item.vendedorFee)}</div>
                  </td>
                  <td className="p-3.5 font-bold text-stone-700 dark:text-stone-300 tabular-nums">
                    {formatCurrencyBRL(item.imobiliariaFee)}
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      item.status === 'Pago'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : item.status === 'Faturado'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
