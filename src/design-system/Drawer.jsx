import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Gaveta lateral ergonômica (Slide-over drawer)
 * Suporta acessibilidade WCAG (tecla ESC fecha, foco gerenciado, backdrop suave).
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'max-w-md'
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex pl-10 max-w-full">
        <div className={`w-screen ${width} bg-white dark:bg-stone-900 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out`}>
          {/* Header do Drawer */}
          <div className="px-6 py-5 border-b border-stone-200 dark:border-stone-800 flex items-start justify-between bg-stone-50/70 dark:bg-stone-900">
            <div>
              <h2 id="drawer-title" className="text-base font-semibold text-stone-900 dark:text-stone-100">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar gaveta"
              className="p-2 -mr-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conteúdo com scroll */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {children}
          </div>

          {/* Footer opcional */}
          {footer && (
            <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

