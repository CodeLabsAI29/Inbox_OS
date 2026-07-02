import React from 'react';

export const EmailSkeletonRow: React.FC = () => {
  return (
    <div className="glass rounded-2xl p-4 border border-white/5 flex gap-4 animate-pulse relative overflow-hidden">
      {/* Indicator line skeleton */}
      <div className="w-1.5 h-16 rounded-full bg-white/10 shrink-0" />

      <div className="flex-1 space-y-3.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          {/* Sender name skeleton */}
          <div className="h-4 w-32 bg-white/10 rounded-lg" />
          <div className="flex items-center gap-2">
            {/* Date skeleton */}
            <div className="h-3 w-16 bg-white/5 rounded-md" />
            {/* Score badge skeleton */}
            <div className="h-4 w-14 bg-white/5 rounded-md" />
          </div>
        </div>

        {/* Subject skeleton */}
        <div className="h-4 w-1/3 bg-white/15 rounded-lg" />

        {/* Summary skeleton */}
        <div className="space-y-1.5">
          <div className="h-3 w-full bg-white/5 rounded-md" />
          <div className="h-3 w-4/5 bg-white/5 rounded-md" />
        </div>

        {/* Badges footer skeleton */}
        <div className="flex items-center gap-2 pt-1.5">
          <div className="h-4.5 w-16 bg-white/5 rounded-md" />
          <div className="h-4.5 w-20 bg-white/5 rounded-md" />
        </div>
      </div>
    </div>
  );
};

export const EmailSkeletonList: React.FC<{ count?: number }> = ({
  count = 4,
}) => {
  const rows = Array.from({ length: count });

  return (
    <div className="space-y-3.5">
      {rows.map((_, index) => (
        <EmailSkeletonRow key={index} />
      ))}
    </div>
  );
};
