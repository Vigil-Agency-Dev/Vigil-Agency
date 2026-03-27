'use client';

import React from 'react';

interface DotProps {
  color: string;
  pulse?: boolean;
}

export default function Dot({ color, pulse }: DotProps) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-1.5"
      style={{
        background: color,
        boxShadow: `0 0 8px ${color}`,
        animation: pulse ? 'pulse 2s ease-in-out infinite' : 'none',
      }}
    />
  );
}
