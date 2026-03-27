'use client';

import React from 'react';

interface CardProps {
  title: string;
  icon?: string;
  accent?: string;
  full?: boolean;
  children: React.ReactNode;
}

export default function Card({ title, icon, accent, full, children }: CardProps) {
  return (
    <div
      className="animate-fadeIn bg-[#1a2235] border border-[#2a3550] rounded-xl p-5 md:p-6"
      style={{
        gridColumn: full ? '1 / -1' : undefined,
        borderTop: accent ? `2px solid ${accent}` : undefined,
      }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        {icon && <span className="text-base">{icon}</span>}
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">{title}</h3>
      </div>
      {children}
    </div>
  );
}
