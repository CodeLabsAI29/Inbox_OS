import React, { useState, useEffect } from 'react';

export interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | number;
  className?: string;
}

/**
 * Extracts the initials (up to 2 characters) from a given name.
 */
const getInitials = (name: string): string => {
  if (!name) return '?';
  let cleanName = name.trim();
  if (!cleanName) return '?';
  if (!cleanName.includes(' ') && cleanName.includes('@')) {
    cleanName = cleanName.split('@')[0];
  }
  cleanName = cleanName.replace(/[._-]/g, ' ');
  const parts = cleanName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Neubrutalism solid color palette for avatars.
 */
const AVATAR_COLORS = [
  { bg: '#FFE34D', fg: '#111' }, // Yellow
  { bg: '#111111', fg: '#fff' }, // Black
  { bg: '#2563EB', fg: '#fff' }, // Blue
  { bg: '#16A34A', fg: '#fff' }, // Green
  { bg: '#DC2626', fg: '#fff' }, // Red
  { bg: '#D97706', fg: '#111' }, // Amber
  { bg: '#7C3AED', fg: '#fff' }, // Purple
  { bg: '#0891B2', fg: '#fff' }, // Cyan
  { bg: '#BE185D', fg: '#fff' }, // Pink
];

const getColorStyle = (name: string): { bg: string; fg: string } => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  imageUrl,
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  const isPresetSize = typeof size === 'string';

  const sizeClass = isPresetSize
    ? {
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
      }[size as 'sm' | 'md' | 'lg'] || 'h-10 w-10 text-sm'
    : '';

  const customStyle: React.CSSProperties = !isPresetSize
    ? {
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${(size as number) * 0.38}px`,
      }
    : {};

  const initials = getInitials(name);
  const colorStyle = getColorStyle(name);

  // Neubrutalism: square avatar with ink border
  const baseClasses =
    'relative flex items-center justify-center shrink-0 font-bold select-none transition-all duration-200';

  if (imageUrl && !hasError) {
    return (
      <div
        className={`${baseClasses} ${sizeClass} ${className}`}
        style={{
          ...customStyle,
          border: '1px solid var(--avatar-border, var(--color-ink))',
          overflow: 'hidden',
        }}
      >
        <img
          src={imageUrl}
          alt={name}
          onError={() => setHasError(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${sizeClass} ${className}`}
      style={{
        ...customStyle,
        backgroundColor: colorStyle.bg,
        color: colorStyle.fg,
        border: '1px solid var(--avatar-border, var(--color-ink))',
        fontFamily: 'var(--avatar-font, var(--font-display))',
      }}
    >
      <span className="tracking-tight uppercase">{initials}</span>
    </div>
  );
};
