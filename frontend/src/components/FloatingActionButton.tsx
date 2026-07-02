import React from 'react';
import { Plus } from 'lucide-react';
import { useCompose } from '../context/ComposeContext';

export const FloatingActionButton: React.FC = () => {
  const { openCompose } = useCompose();

  return (
    <button
      onClick={() => openCompose()}
      className="fixed bottom-6 right-6 z-40 block md:hidden w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center glow-accent hover:scale-105 active:scale-95 transition-all duration-200"
      aria-label="Compose email"
    >
      <Plus size={24} />
    </button>
  );
};
