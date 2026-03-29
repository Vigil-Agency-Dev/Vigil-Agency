'use client';

import React, { createContext, useContext } from 'react';

export interface OperationContext {
  id: string;
  codename: string;
  status: string;
  /** Filter tag — used to filter VPS data by operation */
  filterTag: string;
}

const DEFAULT_OP: OperationContext = {
  id: 'op-001',
  codename: 'PROJECT LUMEN',
  status: 'active',
  filterTag: 'lumen',
};

const OpContext = createContext<OperationContext>(DEFAULT_OP);

export function OperationProvider({ operation, children }: { operation: OperationContext; children: React.ReactNode }) {
  return <OpContext.Provider value={operation}>{children}</OpContext.Provider>;
}

export function useOperation() {
  return useContext(OpContext);
}

// Map operation IDs to filter tags
export function getOperationFilter(opId: string): string {
  switch (opId) {
    case 'op-001': return 'lumen';
    case 'op-002': return 'epstein';
    case 'op-003': return 'southern-cross';
    default: return '';
  }
}
