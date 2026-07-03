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
    <div className="flex flex-col items-center justify-center text-center p-12 glass rounded-3xl border border-white/5 min-h-[320px] w-full">
      {/* Semi-transparent and large icon wrapper */}
      <div className="mb-4 text-gray-400/30 p-4 bg-white/[0.01] rounded-2xl ring-1 ring-white/5 flex items-center justify-center">
        <Icon size={48} className="stroke-[1.25]" />
      </div>
      
      {/* Title */}
      <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
      
      {/* Description utilizing var(--text-muted) */}
      <p 
        style={{ color: 'var(--text-muted)' }} 
        className="text-xs max-w-[280px] leading-relaxed"
      >
        {description}
      </p>
    </div>
  );
};
