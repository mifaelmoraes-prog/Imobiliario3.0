import React, { useState, useEffect } from 'react';
import { BuyerProfileProvider } from './context/BuyerProfileContext';
import { PropertyProvider } from './context/PropertyContext';
import { PublicPortalPage } from './portal/pages/PublicPortalPage';
import { CrmModule } from './crm/CrmModule';
import { LoginModal } from './crm/auth/LoginModal';

const AUTH_STORAGE_KEY = 'urban_real_state_auth_user_v3';
const THEME_STORAGE_KEY = 'urban_real_state_theme_v3';

export function AppContent() {
  const [currentView, setCurrentView] = useState('portal'); // 'portal' | 'crm'
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  // Usuário Autenticado (RBAC)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Tema Claro / Escuro (Claro é o padrão - US-11)
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
    }
  }, [isDark]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Erro ao persistir sessão:', e);
    }
    setCurrentView('crm');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.error('Erro ao limpar sessão:', e);
    }
    setCurrentView('portal');
  };

  return (
    <>
      {currentView === 'portal' ? (
        <PublicPortalPage
          onNavigateToCrm={() => {
            if (currentUser) {
              setCurrentView('crm');
            } else {
              setIsLoginModalOpen(true);
            }
          }}
          isBrokerLoggedIn={Boolean(currentUser)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onToggleTheme={() => setIsDark(prev => !prev)}
          isDark={isDark}
        />
      ) : (
        <CrmModule
          currentUser={currentUser}
          onLogout={handleLogout}
          onBackToPortal={() => setCurrentView('portal')}
        />
      )}

      {/* Gate de Autenticação RBAC */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}

export default function App() {
  return (
    <BuyerProfileProvider>
      <PropertyProvider>
        <AppContent />
      </PropertyProvider>
    </BuyerProfileProvider>
  );
}
