import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon,
}) => {
  return (
    <div
      className="flex flex-col items-center justify-center text-center p-12 min-h-[320px] w-full rounded-[22px]"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Icon block */}
      <div
        className="mb-6 p-5 flex items-center justify-center rounded-full"
        style={{
          backgroundColor: 'rgba(93,107,47,.08)',
        }}
      >
        <Icon size={36} style={{ color: 'var(--color-primary)' }} />
      </div>

      {/* Title */}
      <h3
        className="text-[15px] font-semibold mb-2"
        style={{ color: 'var(--color-ink)' }}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className="text-[13px] max-w-[280px] leading-relaxed"
        style={{ color: 'var(--color-muted)' }}
      >
        {description}
      </p>
    </div>
  );
};
