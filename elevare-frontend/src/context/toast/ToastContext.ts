import {createContext} from 'react';

export type ToastKind = 'ok' | 'error' | 'info';
export interface ToastOptions {
  kind?: ToastKind;
  /* stays until closed (e.g. a temporary password to copy); others auto-close */
  persist?: boolean;
}
export interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
  persist: boolean;
}

export interface ToastValue {
  /* returns its id */
  show: (text: string, options?: ToastOptions) => number;
  success: (text: string, options?: Omit<ToastOptions, 'kind'>) => number;
  error: (text: string, options?: Omit<ToastOptions, 'kind'>) => number;
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastValue | null>(null);
