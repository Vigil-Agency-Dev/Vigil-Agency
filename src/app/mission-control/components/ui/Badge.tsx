'use client';

import React from 'react';

const BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  GREEN: { bg: 'rgba(16,185,129,.15)', text: '#10b981', border: 'rgba(16,185,129,.3)' },
  YELLOW: { bg: 'rgba(245,158,11,.1)', text: '#f59e0b', border: 'rgba(245,158,11,.25)' },
  AMBER: { bg: 'rgba(245,158,11,.15)', text: '#f59e0b', border: 'rgba(245,158,11,.3)' },
  ORANGE: { bg: 'rgba(249,115,22,.15)', text: '#f97316', border: 'rgba(249,115,22,.3)' },
  RED: { bg: 'rgba(239,68,68,.15)', text: '#ef4444', border: 'rgba(239,68,68,.3)' },
  HIGH: { bg: 'rgba(59,130,246,.15)', text: '#3b82f6', border: 'rgba(59,130,246,.3)' },
  MEDIUM: { bg: 'rgba(139,92,246,.1)', text: '#8b5cf6', border: 'rgba(139,92,246,.25)' },
  BLACK: { bg: 'rgba(255,255,255,.05)', text: '#e2e8f0', border: 'rgba(255,255,255,.15)' },
  CRITICAL: { bg: 'rgba(239,68,68,.15)', text: '#ef4444', border: 'rgba(239,68,68,.3)' },
};

interface BadgeProps {
  level: string;
  small?: boolean;
}

export default function Badge({ level, small }: BadgeProps) {
  const colors = BADGE_COLORS[level] || { bg: 'rgba(100,116,139,.1)', text: '#94a3b8', border: 'rgba(100,116,139,.25)' };
  return (
    <span
      className="inline-block rounded font-semibold tracking-wider"
      style={{
        padding: small ? '2px 8px' : '3px 12px',
        fontSize: small ? '10px' : '12px',
        fontFamily: "'JetBrains Mono', monospace",
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {level}
    </span>
  );
}
