import React from 'react';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  subtitle?: string;
  color?: 'blue' | 'indigo' | 'purple' | 'coral' | 'white';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  subtitle,
  color = 'white',
  className,
}) => {
  const colorStyles = {
    blue: 'bg-[#7DA0FA] text-white shadow-skydash-blue border-transparent',
    indigo: 'bg-[#4B49AC] text-white shadow-skydash-primary border-transparent',
    purple: 'bg-[#7978E9] text-white shadow-skydash-purple border-transparent',
    coral: 'bg-[#F3797E] text-white shadow-skydash-coral border-transparent',
    white: 'bg-white text-[#1F1F2C] border-[#ECEEF5] shadow-skydash',
  };

  const isColored = color !== 'white';

  return (
    <div
      className={clsx(
        'group relative overflow-hidden p-4 sm:p-5 lg:p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1',
        colorStyles[color],
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={clsx(
            'text-[11px] sm:text-xs font-semibold uppercase tracking-wider truncate',
            isColored ? 'text-white/80' : 'text-[#6C7383]'
          )}
        >
          {title}
        </span>
        <div
          className={clsx(
            'p-2 sm:p-2.5 rounded-xl transition-all duration-300 shadow-sm shrink-0',
            isColored
              ? 'bg-white/15 text-white group-hover:bg-white group-hover:text-[#4B49AC]'
              : 'bg-[#F5F7FF] text-[#4B49AC] border border-[#ECEEF5] group-hover:bg-[#4B49AC] group-hover:text-white'
          )}
        >
          {icon}
        </div>
      </div>

      <div className="mt-3 sm:mt-4">
        <div
          className={clsx(
            'text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight font-mono truncate',
            isColored ? 'text-white' : 'text-[#1F1F2C]'
          )}
        >
          {value}
        </div>

        {(change || subtitle) && (
          <div className="mt-2.5 flex items-center flex-wrap text-xs gap-2">
            {change && (
              <span
                className={clsx(
                  'font-semibold px-2 py-0.5 rounded-full text-[11px] shadow-sm',
                  isColored
                    ? 'bg-white/20 text-white border border-white/30'
                    : changeType === 'positive'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : changeType === 'negative'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-[#F5F7FF] text-[#4B49AC] border border-[#ECEEF5]'
                )}
              >
                {change}
              </span>
            )}
            {subtitle && (
              <span className={clsx('font-medium text-xs', isColored ? 'text-white/80' : 'text-[#8F93A0]')}>
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
