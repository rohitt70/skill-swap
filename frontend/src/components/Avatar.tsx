'use client';

import React from 'react';

interface AvatarProps {
  name: string;
  url?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ name, url, size = 'md', className = '' }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg font-bold',
    xl: 'w-20 h-20 text-2xl font-bold',
  };

  const getInitials = (n: string) => {
    if (!n) return 'SS';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-indigo-200 shadow-sm ${className}`}
      />
    );
  }

  // Consistent pleasant color based on initials
  const initials = getInitials(name);
  const colorSchemes = [
    'bg-indigo-600 text-white',
    'bg-teal-600 text-white',
    'bg-violet-600 text-white',
    'bg-amber-600 text-white',
    'bg-rose-600 text-white',
  ];
  const charCode = (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % colorSchemes.length;
  const bg = colorSchemes[charCode];

  return (
    <div
      className={`${sizeClasses[size]} rounded-full ${bg} flex items-center justify-center font-semibold shadow-sm select-none ${className}`}
    >
      {initials}
    </div>
  );
}
