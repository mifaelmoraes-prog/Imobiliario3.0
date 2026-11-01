import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Modal centralizado acessível com foco gerenciado e backdrop com blur
 */
export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
  showCloseButton = true
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
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="min-h-full flex items-center justify-center p-4 text-center sm:p-6">
        <div 
          className={`relative transform overflow-hidden rounded-2xl bg-white dark:bg-stone-900 text-left shadow-2xl transition-all sm:my-8 w-full ${maxWidth} border border-stone-200/80 dark:border-stone-800`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="px-6 py-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <div>
                {title && (
                  <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar modal"
                  className="rounded-lg p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Conteúdo */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

