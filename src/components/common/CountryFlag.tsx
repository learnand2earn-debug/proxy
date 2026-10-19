'use client';

import React, { useState } from 'react';
import { Globe } from 'lucide-react';

interface CountryFlagProps {
  code?: string;
  name?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const CountryFlag: React.FC<CountryFlagProps> = ({
  code,
  name,
  className = '',
  size = 'sm'
}) => {
  const [hasError, setHasError] = useState(false);
  const cleanCode = (code || '').trim().toLowerCase();

  const isGlobal = !cleanCode || cleanCode === 'all' || cleanCode === 'global' || cleanCode.length !== 2;

  if (isGlobal || hasError) {
    const iconSizes = {
      xs: 'w-3.5 h-3.5',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    };
    return (
      <span className={`inline-flex items-center justify-center shrink-0 ${iconSizes[size]} ${className}`}>
        <Globe className="w-full h-full text-cyan-400 opacity-90" />
      </span>
    );
  }

  const containerSizes = {
    xs: 'w-4 h-3',
    sm: 'w-5 h-3.5',
    md: 'w-6 h-4',
    lg: 'w-8 h-5.5'
  };

  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-[2px] shadow-sm border border-slate-700/80 bg-slate-900 shrink-0 ${containerSizes[size]} ${className}`}
      title={name || code?.toUpperCase()}
    >
      <img
        src={`https://flagcdn.com/24x18/${cleanCode}.png`}
        alt={name || code?.toUpperCase() || 'flag'}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </span>
  );
};
