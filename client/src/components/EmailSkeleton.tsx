import React from 'react';

export const EmailSkeletonRow: React.FC = () => {
  return (
    <div
      className="px-4 py-3.5 flex gap-4 animate-pulse relative overflow-hidden mb-1.5 rounded-[16px]"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Indicator dot skeleton */}
      <div
        className="w-2 h-2 shrink-0 mt-2.5 rounded-full"
        style={{ backgroundColor: 'var(--color-border)' }}
      />

      <div className="flex-1 space-y-3 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div
            className="h-3.5 w-32 rounded-full"
            style={{ backgroundColor: '#E9E4D8' }}
          />
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-16 rounded-full"
              style={{ backgroundColor: '#EEE9DE' }}
            />
            <div
              className="h-3.5 w-14 rounded-full"
              style={{ backgroundColor: '#EEE9DE' }}
            />
          </div>
        </div>

        {/* Subject skeleton */}
        <div
          className="h-3 w-1/3 rounded-full"
          style={{ backgroundColor: '#E4DFD4' }}
        />

        {/* Summary skeleton */}
        <div className="space-y-1.5">
          <div
            className="h-2.5 w-full rounded-full"
            style={{ backgroundColor: '#EEE9DE' }}
          />
          <div
            className="h-2.5 w-4/5 rounded-full"
            style={{ backgroundColor: '#EEE9DE' }}
          />
        </div>

        {/* Badges skeleton */}
        <div className="flex items-center gap-2 pt-0.5">
          <div
            className="h-4 w-16 rounded-full"
            style={{ backgroundColor: '#E9E4D8' }}
          />
          <div
            className="h-4 w-20 rounded-full"
            style={{ backgroundColor: '#E9E4D8' }}
          />
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
    <div className="space-y-0">
      {rows.map((_, index) => (
        <EmailSkeletonRow key={index} />
      ))}
    </div>
  );
};
