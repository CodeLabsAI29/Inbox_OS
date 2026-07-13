import React from 'react';
import { Plus } from 'lucide-react';
import { useCompose } from '../context/ComposeContext';

export const FloatingActionButton: React.FC = () => {
  const { openCompose } = useCompose();

  return (
    <button
      onClick={() => openCompose()}
      className="fixed bottom-6 right-6 z-40 block md:hidden w-14 h-14 flex items-center justify-center transition-all duration-200 rounded-full"
      style={{
        backgroundColor: 'var(--color-primary)',
        boxShadow: '0 8px 28px rgba(93,107,47,.35)',
        color: '#fff',
      }}
      aria-label="Compose email"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          '0 12px 36px rgba(93,107,47,.45)';
        (e.currentTarget as HTMLElement).style.transform =
          'translateY(-2px) scale(1.05)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          '0 8px 28px rgba(93,107,47,.35)';
        (e.currentTarget as HTMLElement).style.transform = '';
      }}
    >
      <Plus size={22} />
    </button>
  );
};
