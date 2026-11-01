import React, { useState } from 'react';
import { Modal } from '../../design-system/Modal';
import { Button } from '../../design-system/Button';
import { Lock, UserCheck, ShieldCheck, KeyRound } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { role: 'broker', label: 'Consultor Imobiliário (Corretor)', email: 'corretor@urbanrealstate.com.br', name: 'Ricardo Mendes' },
  { role: 'manager', label: 'Gestor Comercial / Diretor', email: 'gestor@urbanrealstate.com.br', name: 'Mariana Duarte' },
  { role: 'admin', label: 'Administrador do Sistema', email: 'admin@urbanrealstate.com.br', name: 'Administrador' }
];

export function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSelectDemo = (account) => {
    onLoginSuccess(account);
    onClose();
  };

  const handleCustomLogin = (e) => {
    e.preventDefault();
    if (!email) {
      setError('Informe um e-mail válido.');
      return;
    }
    const account = {
      role: 'broker',
      label: 'Consultor Imobiliário',
      email,
      name: email.split('@')[0]
    };
    onLoginSuccess(account);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Acesso Restrito — Painel do Corretor"
      subtitle="Ambiente corporativo exclusivo para consultores, gestores e analistas"
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        
        {/* Acesso Rápido para Demonstração */}
        <div>
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-2">
            Perfis de Demonstração (1 Clique)
          </span>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleSelectDemo(acc)}
                className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:border-accent hover:bg-accent/5 dark:hover:bg-accent/10 transition-all text-left flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-stone-900 dark:text-white group-hover:text-accent">
                    {acc.name}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {acc.label}
                  </div>
                </div>
                <ShieldCheck className="w-4 h-4 text-stone-400 group-hover:text-accent" />
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-stone-200 dark:border-stone-700"></div>
          <span className="flex-shrink mx-3 text-xs text-stone-400 font-medium">ou entre com credenciais</span>
          <div className="flex-grow border-t border-stone-200 dark:border-stone-700"></div>
        </div>

        {/* Formulário Manual */}
        <form onSubmit={handleCustomLogin} className="space-y-3">
          {error && (
            <div className="p-2 rounded bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-stone-700 dark:text-stone-300 block mb-1">
              E-mail Corporativo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.nome@imobiliaria.com.br"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-white focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-stone-700 dark:text-stone-300 block mb-1">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-white focus:outline-none focus:border-accent"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-500 hover:text-stone-800"
            >
              Cancelar
            </button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              icon={Lock}
            >
              Autenticar
            </Button>
          </div>
        </form>

      </div>
    </Modal>
  );
}

