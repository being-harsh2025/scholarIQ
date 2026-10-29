import React from 'react';

// Card
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ children, className = '', title, subtitle, action }) => (
  <div className={`panel-card p-5 ${className}`}>
    {(title || action) && (
      <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
        <div>
          {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    {children}
  </div>
);

// Badge
export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
  className?: string;
}> = ({ children, variant = 'neutral', className = '' }) => {
  const variantStyles = {
    brand: 'bg-brand-50 text-brand-700 border-brand-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};

// Button
export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ReactNode;
  }
> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const base = "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizeStyles = {
    sm: "px-2.5 py-1 text-xs gap-1.5",
    md: "px-3.5 py-2 text-xs gap-2",
    lg: "px-4 py-2.5 text-sm gap-2"
  };

  const variantStyles = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white shadow-sm",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700",
    danger: "bg-rose-600 hover:bg-rose-700 text-white",
    outline: "border border-slate-300 hover:bg-slate-50 text-slate-700",
    ghost: "hover:bg-slate-100 text-slate-600"
  };

  return (
    <button
      className={`${base} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
};

// Alert
export const Alert: React.FC<{
  type?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ type = 'info', title, children, className = '' }) => {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-rose-50 border-rose-200 text-rose-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  };

  return (
    <div className={`p-4 rounded-xl border text-xs leading-relaxed ${styles[type]} ${className}`}>
      {title && <div className="font-semibold mb-1 text-sm">{title}</div>}
      <div>{children}</div>
    </div>
  );
};

// Loading Spinner
export const LoadingSpinner: React.FC<{ text?: string }> = ({ text = "Loading data..." }) => (
  <div className="py-12 flex flex-col items-center justify-center gap-3">
    <div className="w-7 h-7 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    <span className="text-xs text-slate-500 font-medium">{text}</span>
  </div>
);
