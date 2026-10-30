import React from 'react';

type StatCardColor = 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'coral' | 'purple';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  color?: StatCardColor;
}

const colorMap: Record<StatCardColor, { icon: string; value: string }> = {
  blue:   { icon: 'bg-brand-50 text-brand-700',   value: 'text-slate-900' },
  green:  { icon: 'bg-green-50 text-green-700',   value: 'text-slate-900' },
  amber:  { icon: 'bg-amber-50 text-amber-700',   value: 'text-slate-900' },
  red:    { icon: 'bg-red-50 text-red-700',       value: 'text-slate-900' },
  violet: { icon: 'bg-violet-50 text-violet-700', value: 'text-slate-900' },
  coral:  { icon: 'bg-rose-50 text-rose-700',     value: 'text-slate-900' },
  purple: { icon: 'bg-violet-50 text-violet-700', value: 'text-slate-900' },
};

const changeClasses = {
  positive: 'text-green-600 bg-green-50',
  negative: 'text-red-600 bg-red-50',
  neutral: 'text-slate-500 bg-slate-50',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  changeType = 'neutral',
  icon,
  color = 'blue',
}) => {
  const colors = colorMap[color];

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {title}
          </p>
          <p
            className={`mt-2 text-2xl font-bold font-mono tabular-nums tracking-tight ${colors.value}`}
          >
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
          {change && (
            <span
              className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${changeClasses[changeType]}`}
            >
              {change}
            </span>
          )}
        </div>

        {icon && (
          <div
            className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colors.icon}`}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
