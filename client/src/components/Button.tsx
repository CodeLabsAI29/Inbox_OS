import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  type = 'button',
  style,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    borderRadius: '10px',
    border: '1px solid transparent',
    transition: 'all 0.18s ease',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.55 : 1,
    outline: 'none',
  };

  const variantStyle: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--color-primary)',
      color: '#ffffff',
      boxShadow: '0 4px 14px rgba(93,107,47,.25)',
      borderColor: 'transparent',
    },
    secondary: {
      backgroundColor: 'var(--color-surface)',
      color: 'var(--color-muted)',
      boxShadow: 'var(--shadow-sm)',
      borderColor: 'var(--color-border)',
    },
    accent: {
      backgroundColor: 'rgba(228,184,92,.12)',
      color: '#C49030',
      boxShadow: 'none',
      borderColor: 'rgba(228,184,92,.30)',
    },
    danger: {
      backgroundColor: 'rgba(217,104,87,.10)',
      color: 'var(--color-danger)',
      boxShadow: 'none',
      borderColor: 'rgba(217,104,87,.25)',
    },
  };

  const sizeStyle: Record<string, React.CSSProperties> = {
    sm: { padding: '5px 12px', fontSize: '12px', gap: '5px' },
    md: { padding: '9px 18px', fontSize: '13px', gap: '7px' },
    lg: { padding: '12px 24px', fontSize: '14px', gap: '8px' },
  };

  const hoverMap: Record<string, React.CSSProperties> = {
    primary: {
      boxShadow: '0 6px 20px rgba(93,107,47,.35)',
      transform: 'translateY(-1px)',
    },
    secondary: {
      boxShadow: 'var(--shadow-card)',
      borderColor: 'rgba(93,107,47,.25)',
      color: 'var(--color-ink)',
      transform: 'translateY(-1px)',
    },
    accent: {
      backgroundColor: 'rgba(228,184,92,.20)',
      transform: 'translateY(-1px)',
    },
    danger: {
      backgroundColor: 'rgba(217,104,87,.15)',
      transform: 'translateY(-1px)',
    },
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;
    const el = e.currentTarget;
    const hover = hoverMap[variant] || {};
    Object.assign(el.style, hover);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;
    const el = e.currentTarget;
    const vs = variantStyle[variant] || {};
    el.style.boxShadow = (vs.boxShadow as string) || 'none';
    el.style.transform = '';
    el.style.borderColor = (vs.borderColor as string) || 'transparent';
    el.style.backgroundColor = (vs.backgroundColor as string) || '';
    el.style.color = (vs.color as string) || '';
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;
    e.currentTarget.style.transform = 'translateY(0) scale(0.97)';
    e.currentTarget.style.boxShadow = 'none';
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;
    const hover = hoverMap[variant] || {};
    Object.assign(e.currentTarget.style, hover);
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 focus-visible:ring-offset-1 outline-none transition-all ${className}`}
      style={{
        ...baseStyle,
        ...variantStyle[variant],
        ...sizeStyle[size],
        ...style,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      <span>{children}</span>
    </button>
  );
};
