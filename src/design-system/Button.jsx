import React from 'react';

/**
 * Botão acessível em conformidade com WCAG 2.1 AA (alvo mínimo de toque 44px).
 * Segue a regra "Um Acento, Uma Função": o estilo 'primary' usa a cor de acento institucional.
 */
export function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
  size = 'md',        // 'sm' | 'md' | 'lg' | 'icon'
  icon: Icon,
  iconPosition = 'left',
  className = '',
  disabled = false,
  ariaLabel,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 select-none rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'min-h-[38px] px-3 text-xs gap-1.5',
    md: 'min-h-[44px] px-4 text-sm gap-2',
    lg: 'min-h-[50px] px-6 text-base gap-2.5',
    icon: 'min-w-[44px] min-h-[44px] p-2.5 rounded-lg'
  };

  const variantStyles = {
    primary: 'bg-accent text-white hover:bg-accent-hover shadow-sm focus-visible:outline-accent active:bg-accent-hover',
    secondary: 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-750 shadow-sm focus-visible:outline-stone-500',
    outline: 'bg-transparent text-stone-700 dark:text-stone-200 border border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800/50',
    ghost: 'bg-transparent text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/80 hover:text-stone-900 dark:hover:text-white',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm focus-visible:outline-rose-500'
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      {...props}
    >
      {Icon && iconPosition === 'left' && (
        <Icon className={`${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} />
      )}
      {children}
      {Icon && iconPosition === 'right' && (
        <Icon className={`${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} />
      )}
    </button>
  );
}
