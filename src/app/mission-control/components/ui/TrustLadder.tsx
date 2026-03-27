'use client';

import React from 'react';

interface TrustLadderProps {
  level: number;
  target: number;
}

const LABELS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];

export default function TrustLadder({ level, target }: TrustLadderProps) {
  return (
    <div className="flex gap-0.5 items-center">
      {LABELS.map((l, i) => (
        <div
          key={l}
          title={`${l}${i === target ? ' (TARGET)' : ''}`}
          className="rounded-sm"
          style={{
            width: '18px',
            height: '7px',
            background: i <= level ? '#3b82f6' : i <= target ? 'rgba(59,130,246,.2)' : 'rgba(255,255,255,.04)',
            border: i === target ? '1px solid #3b82f6' : '1px solid transparent',
          }}
        />
      ))}
    </div>
  );
}
