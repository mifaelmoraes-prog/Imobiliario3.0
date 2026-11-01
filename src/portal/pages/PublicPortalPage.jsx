import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { HeroSearch } from '../components/HeroSearch';
import { ProfileCompactStrip } from '../components/ProfileCompactStrip';
import { ProfileDrawer } from '../components/ProfileDrawer';
import { PropertyGrid } from '../components/PropertyGrid';
import { PropertyMap } from '../components/PropertyMap';
import { PropertyDetailModal } from '../components/PropertyDetailModal';
import { SplitVoiceConcierge } from '../components/SplitVoiceConcierge';
import { CriticismModal } from '../components/CriticismModal';
import { ExitIntentModal } from '../components/ExitIntentModal';
import { FinanceSimulatorModal } from '../components/FinanceSimulatorModal';
import { PrerequisitesModal } from '../components/PrerequisitesModal';
import { useProperties } from '../../context/PropertyContext';
import { useBuyerProfile } from '../../context/BuyerProfileContext';

export function PublicPortalPage({
  onNavigateToCrm,
  isBrokerLoggedIn = false,
  onOpenLoginModal,
  onToggleTheme,
  isDark = false
}) {
  const {
    properties,
    viewMode,
    activePropertyDetail,
    setActivePropertyDetail,
    showExitIntent,
    setShowExitIntent
  } = useProperties();

  const { logActivity } = useBuyerProfile();

  // Estados de Modais
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isConciergeOpen, setIsConciergeOpen] = useState(false);
  const [criticismTarget, setCriticismTarget] = useState(null);
  const [financeTarget, setFinanceTarget] = useState(null);
  const [prereqTarget, setPrereqTarget] = useState(null);

  // Detecção de Exit Intent (quando o cursor sobe para fechar a aba)
  useEffect(() => {
    let triggered = false;
    const handleMouseLeave = (e) => {
      if (e.clientY <= 10 && !triggered && !isConciergeOpen && !activePropertyDetail) {
        triggered = true;
        setShowExitIntent(true);
        logActivity('EXIT_INTENT_TRIGGERED', 'Gatilho de intenção de saída do cursor detectado');
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [isConciergeOpen, activePropertyDetail, setShowExitIntent, logActivity]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] dark:bg-stone-900 transition-colors">
      
      {/* 1. Header Limpo (US-01 / GAP-01.1) */}
      <Header
        currentTab="imoveis"
        onOpenConcierge={() => setIsConciergeOpen(true)}
        onOpenProfileDrawer={() => setIsDrawerOpen(true)}
        onNavigateSection={(sec) => {
          if (sec === 'crm') onNavigateToCrm();
        }}
        isBrokerLoggedIn={isBrokerLoggedIn}
        onOpenLoginModal={onOpenLoginModal}
        onToggleTheme={onToggleTheme}
        isDark={isDark}
      />

      {/* 2. Hero com Busca Protagonista (US-01 / GAP-02.1) */}
      <HeroSearch
        onTriggerVoice={() => setIsConciergeOpen(true)}
      />

      {/* 3. Faixa de Perfil Compacta de ~60px (US-03 / GAP-05.1: Devolve 450px para as fotos) */}
      <ProfileCompactStrip
        onOpenDrawer={() => setIsDrawerOpen(true)}
      />

      {/* 4. Grade de Imóveis ou Visualização em Mapa (US-04) */}
      <main className="flex-1">
        {viewMode === 'grid' ? (
          <PropertyGrid
            onSelectProperty={(prop) => {
              setActivePropertyDetail(prop);
              logActivity('VIEW_PROPERTY', `Visualizou detalhes de: ${prop.title}`, { propertyId: prop.id });
            }}
            onAnalyzePrerequisites={(prop) => setPrereqTarget(prop)}
            onOpenDrawer={() => setIsDrawerOpen(true)}
          />
        ) : (
          <PropertyMap
            properties={properties}
            onSelectProperty={(prop) => {
              setActivePropertyDetail(prop);
              logActivity('VIEW_PROPERTY', `Visualizou no mapa: ${prop.title}`, { propertyId: prop.id });
            }}
          />
        )}
      </main>

      {/* Rodapé Elegante com Acesso Corporativo Discreto */}
      <footer className="border-t border-stone-200 dark:border-stone-800 bg-white/50 dark:bg-stone-900/50 py-8 px-4 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © {new Date().getFullYear()} Urban Real State. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onOpenLoginModal}
              className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            >
              Acesso Corporativo / Painel do Corretor
            </button>
          </div>
        </div>
      </footer>

      {/* Drawer Lateral de Edição Completa dos 4 Pilares */}
      <ProfileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Concierge Multimodal em Tela Dividida (US-02) */}
      <SplitVoiceConcierge
        isOpen={isConciergeOpen}
        onClose={() => setIsConciergeOpen(false)}
      />

      {/* Ficha Técnica com Match Explicável (US-05) */}
      <PropertyDetailModal
        property={activePropertyDetail}
        isOpen={Boolean(activePropertyDetail)}
        onClose={() => setActivePropertyDetail(null)}
        onOpenCriticism={(prop) => {
          setActivePropertyDetail(null);
          setCriticismTarget(prop);
        }}
        onOpenFinanceSimulator={(prop) => {
          setFinanceTarget(prop);
        }}
      />

      {/* Modal de Crítica / Calibração de Perfil (US-07) */}
      <CriticismModal
        property={criticismTarget}
        isOpen={Boolean(criticismTarget)}
        onClose={() => setCriticismTarget(null)}
      />

      {/* Popup de Exit Intent e Geração de Dossiê PDF (US-08) */}
      <ExitIntentModal
        isOpen={showExitIntent}
        onClose={() => setShowExitIntent(false)}
      />

      {/* Simulador Multi-Banco SAC/PRICE (US-18) */}
      <FinanceSimulatorModal
        property={financeTarget}
        isOpen={Boolean(financeTarget)}
        onClose={() => setFinanceTarget(null)}
      />

      {/* Análise de Pré-Requisitos (GAP-04.1) */}
      <PrerequisitesModal
        property={prereqTarget}
        isOpen={Boolean(prereqTarget)}
        onClose={() => setPrereqTarget(null)}
        onOpenWhatsApp={(prop) => {
          const text = encodeURIComponent(
            `Olá! Gostaria de consultar os pré-requisitos para a compra do imóvel "${prop.title}" (${prop.neighborhood}).`
          );
          window.open(`https://wa.me/5541999999999?text=${text}`, '_blank');
        }}
      />

    </div>
  );
}

