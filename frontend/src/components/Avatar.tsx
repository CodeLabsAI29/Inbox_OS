import React, { useState, useEffect } from 'react';

export interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | number;
  className?: string;
}

/**
 * Extracts the initials (up to 2 characters) from a given name.
 * Also handles email addresses and removes common delimiters.
 */
const getInitials = (name: string): string => {
  if (!name) return '?';
  
  let cleanName = name.trim();
  if (!cleanName) return '?';

  // Handle email addresses (e.g. "john.doe@example.com")
  if (!cleanName.includes(' ') && cleanName.includes('@')) {
    cleanName = cleanName.split('@')[0];
  }

  // Replace common delimiters with spaces
  cleanName = cleanName.replace(/[._-]/g, ' ');

  const parts = cleanName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  const firstInitial = parts[0].charAt(0);
  const lastInitial = parts[parts.length - 1].charAt(0);
  return (firstInitial + lastInitial).toUpperCase();
};

/**
 * Premium gradients matching the modern, dark aesthetic of InboxOS.
 */
const AVATAR_GRADIENTS = [
  'from-[#ff4582] to-[#ff6b6b]', // Coral/Red
  'from-[#6366f1] to-[#8b5cf6]', // Indigo/Purple
  'from-[#06b6d4] to-[#3b82f6]', // Cyan/Blue
  'from-[#10b981] to-[#059669]', // Emerald/Green
  'from-[#f59e0b] to-[#ea580c]', // Amber/Orange
  'from-[#ec4899] to-[#db2777]', // Pink
  'from-[#14b8a6] to-[#0d9488]', // Teal
  'from-[#a855f7] to-[#7c3aed]', // Violet/Purple
  'from-[#3b82f6] to-[#1d4ed8]', // Blue
];

/**
 * Deterministically retrieves a gradient based on the input name hash.
 */
const getGradientStyle = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  imageUrl,
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state if imageUrl changes
  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  const isPresetSize = typeof size === 'string';
  
  // Tailwind mapping for preset sizes
  const sizeClass = isPresetSize
    ? {
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
      }[size as 'sm' | 'md' | 'lg'] || 'h-10 w-10 text-sm'
    : '';

  // Custom inline styles for custom numerical pixel sizes
  const customStyle: React.CSSProperties = !isPresetSize
    ? {
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${(size as number) * 0.38}px`,
      }
    : {};

  const initials = getInitials(name);
  const gradient = getGradientStyle(name);

  // perfect circle style: rounded-full overflow-hidden
  const baseClasses = 'relative flex items-center justify-center rounded-full overflow-hidden shrink-0 font-bold select-none transition-all duration-200';

  if (imageUrl && !hasError) {
    return (
      <div
        className={`${baseClasses} ${sizeClass} ${className}`}
        style={customStyle}
      >
        <img
          src={imageUrl}
          alt={name}
          onError={() => setHasError(true)}
          className="h-full w-full object-cover rounded-full"
        />
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} bg-gradient-to-br ${gradient} ${sizeClass} ${className}`}
      style={customStyle}
    >
      <span className="tracking-tight text-white uppercase">{initials}</span>
    </div>
  );
};
