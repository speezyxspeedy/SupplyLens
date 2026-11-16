import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { DependencyType, Severity } from '../../types';

export const SeverityIndicator: React.FC<{ severity: Severity }> = ({ severity }) => {
  switch (severity) {
    case 'CRITICAL':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          CRITICAL
        </span>
      );
    case 'HIGH':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 whitespace-nowrap">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          HIGH
        </span>
      );
    case 'MEDIUM':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          MEDIUM
        </span>
      );
    case 'LOW':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-700 dark:text-cyan-400 whitespace-nowrap">
          <Info className="h-3.5 w-3.5 shrink-0" />
          LOW
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          INFO
        </span>
      );
  }
};

export function formatDepTypeLabel(type: DependencyType): string {
  switch (type) {
    case 'DEPENDENCY':
      return 'Runtime';
    case 'DEV_DEPENDENCY':
      return 'Development';
    case 'OPTIONAL_DEPENDENCY':
      return 'Optional';
    case 'PEER_DEPENDENCY':
      return 'Peer';
    case 'WORKSPACE_LINK':
      return 'Workspace';
  }
}

export function getDepTypeTextClass(type: DependencyType): string {
  switch (type) {
    case 'DEPENDENCY':
      return 'text-emerald-700 dark:text-emerald-400';
    case 'DEV_DEPENDENCY':
      return 'text-cyan-700 dark:text-cyan-400';
    case 'OPTIONAL_DEPENDENCY':
      return 'text-amber-700 dark:text-amber-400';
    case 'PEER_DEPENDENCY':
      return 'text-indigo-700 dark:text-indigo-400';
    case 'WORKSPACE_LINK':
      return 'text-teal-700 dark:text-teal-300';
  }
}
