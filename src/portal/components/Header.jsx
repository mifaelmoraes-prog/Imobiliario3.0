import React from 'react';
import { Sparkles, Building2, SlidersHorizontal, Moon, Sun, ShieldCheck } from 'lucide-react';
import { Button } from '../../design-system/Button';

export function Header({
  onOpenConcierge,
  onOpenProfileDrawer,
  onNavigateSection,
  currentTab = 'imoveis',
  isBrokerLoggedIn = false,
  onOpenLoginModal,
  onToggleTheme,
  isDark = false
}) {
  return (
    <header className="sticky top-0 z-40 bg-[#FAFAF8]/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        
        {/* Identidade Visual / Logotipo (Ref. UX Tópico 01 / US-01 / GAP-01.2) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigateSection('imoveis')}>
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-white shadow-sm shadow-accent/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-stone-900 dark:text-white tracking-tight">
                  URBAN <span className="text-accent font-light">REAL STATE</span>
                </span>
                {/* Selo neutro e discreto conforme GAP-01.2 */}
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 border border-stone-200 dark:border-stone-700">
                  Demo
                </span>
              </div>
              <span className="text-[11px] text-stone-400 font-medium hidden sm:block">
                Inteligência e Curadoria Imobiliária
              </span>
            </div>
          </div>
        </div>

        {/* Navegação por Texto Limpo (Ref. UX Tópico 01 / US-01) */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onNavigateSection('imoveis')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              currentTab === 'imoveis'
                ? 'text-accent bg-accent/5 dark:bg-accent/10 font-semibold'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            Imóveis
          </button>

          <button
            onClick={() => onOpenProfileDrawer()}
            className="px-3 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-4 h-4 text-stone-400" />
            <span>Filtros & Match</span>
          </button>
        </nav>

        {/* Ações do Header (Um Acento, Uma Função / Concierge Protagonista) */}
        <div className="flex items-center gap-2.5">
          {/* Alternador de Tema Claro/Escuro */}
          <button
            onClick={onToggleTheme}
            aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Painel do Corretor (Visível exclusivamente para autenticados ou atalho corporativo - GAP-01.1 / US-10) */}
          {isBrokerLoggedIn ? (
            <Button
              variant="secondary"
              size="sm"
              icon={ShieldCheck}
              onClick={() => onNavigateSection('crm')}
              ariaLabel="Acessar Painel do Corretor"
              className="text-xs"
            >
              Painel do Corretor
            </Button>
          ) : (
            <button
              onClick={onOpenLoginModal}
              aria-label="Acesso corporativo de corretores"
              className="text-xs font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 px-2.5 py-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors hidden sm:block"
            >
              Acesso Corretor
            </button>
          )}

          {/* Único Botão de Destaque Visual (Ref. UX Tópico 01: Concierge) */}
          <Button
            variant="primary"
            size="md"
            icon={Sparkles}
            onClick={onOpenConcierge}
            ariaLabel="Abrir Concierge Digital de Imóveis"
            className="shadow-md shadow-accent/20"
          >
            Concierge
          </Button>
        </div>

      </div>
    </header>
  );
}

