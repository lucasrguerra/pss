import { clsx } from 'clsx';

type BadgeVariant = 'cpu' | 'io' | 'balanced' | 'slate';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  cpu: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  io: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
  balanced: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
  slate: 'bg-slate-700 text-slate-400 border border-slate-600',
};

const Badge = ({ variant = 'slate', children, className }: BadgeProps) => (
  <span
    className={clsx(
      'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
      variantClasses[variant],
      className,
    )}
  >
    {children}
  </span>
);

export default Badge;
