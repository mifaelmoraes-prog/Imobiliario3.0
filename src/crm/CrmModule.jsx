import React, { useState } from 'react';
import { RevenueHome } from './dashboard/RevenueHome';
import { KanbanBoard } from './pipeline/KanbanBoard';
import { InventoryTable } from './inventory/InventoryTable';
import { PropertyBuyersView } from './inventory/PropertyBuyersView';
import { CommissionPanel } from './finance/CommissionPanel';
import { AutomationsConsole } from './integrations/AutomationsConsole';
import { Button } from '../design-system/Button';
import { 
  Building2, 
  TrendingUp, 
  Kanban, 
  Layers, 
  DollarSign, 
  Cpu, 
  LogOut, 
  ArrowLeft,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export function CrmModule({
  currentUser,
  onLogout,
  onBackToPortal
}) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'pipeline' | 'inventory' | 'commission' | 'automations'
  const [selectedPropertyForReverseMatch, setSelectedPropertyForReverseMatch] = useState(null);

  const tabs = [
    { id: 'dashboard', label: 'Revenue Home', icon: TrendingUp },
    { id: 'pipeline', label: 'Funil Kanban (7 Fases)', icon: Kanban },
    { id: 'inventory', label: 'Estoque & LQS', icon: Layers },
    { id: 'commission', label: 'Comissões & Splits', icon: DollarSign },
    { id: 'automations', label: 'Automações & Webhooks', icon: Cpu }
  ];

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 flex flex-col transition-colors">
      
      {/* Header do Backoffice Corporativo */}
      <header className="bg-stone-900 text-white px-4 sm:px-6 lg:px-8 py-3.5 border-b border-stone-800 flex items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToPortal}
            className="flex items-center gap-1.5 text-xs text-stone-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-stone-800 transition-colors"
            title="Voltar para a visualização pública do portal"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Ver Portal Público</span>
          </button>

          <div className="h-5 w-px bg-stone-700 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center font-bold text-xs">
              U
            </div>
            <span className="font-bold text-sm tracking-tight hidden md:inline">
              URBAN <span className="text-accent font-light">CRM & REVENUE</span>
            </span>
          </div>
        </div>

        {/* Informações do Usuário Autenticado (RBAC) */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white flex items-center gap-1.5 justify-end">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentUser?.name || 'Ricardo Mendes'}</span>
            </div>
            <div className="text-[10px] text-stone-400">
              {currentUser?.label || 'Consultor Imobiliário'}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            icon={LogOut}
            className="text-stone-300 hover:text-white hover:bg-stone-800 text-xs"
          >
            Sair
          </Button>
        </div>

      </header>

      {/* Sub-navegação em Abas do CRM */}
      <div className="bg-white dark:bg-stone-850 border-b border-stone-200 dark:border-stone-800 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedPropertyForReverseMatch(null);
                  setActiveTab(tab.id);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo Principal do CRM */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {selectedPropertyForReverseMatch ? (
          <PropertyBuyersView
            property={selectedPropertyForReverseMatch}
            onBack={() => setSelectedPropertyForReverseMatch(null)}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <RevenueHome onNavigateTab={(tab) => setActiveTab(tab)} />
            )}
            {activeTab === 'pipeline' && (
              <KanbanBoard />
            )}
            {activeTab === 'inventory' && (
              <InventoryTable
                onSelectPropertyForBuyers={(prop) => setSelectedPropertyForReverseMatch(prop)}
              />
            )}
            {activeTab === 'commission' && (
              <CommissionPanel />
            )}
            {activeTab === 'automations' && (
              <AutomationsConsole />
            )}
          </>
        )}
      </main>

    </div>
  );
}

