import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  label: string;
}

const variantClasses = {
  default: 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600',
  primary: 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500',
  danger: 'bg-red-600/80 hover:bg-red-500 text-white border-red-500',
  ghost: 'bg-transparent hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-transparent',
};

const sizeClasses = {
  sm: 'h-7 w-7 text-sm',
  md: 'h-9 w-9 text-base',
};

const IconButton = ({
  children,
  variant = 'default',
  size = 'md',
  label,
  className,
  disabled,
  ...rest
}: IconButtonProps) => {
  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
};

export default IconButton;
