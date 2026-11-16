import {use} from 'react';
import {ToastContext} from '@/context/toast/ToastContext';

export function useToast() {
  const toast = use(ToastContext);
  if (!toast) throw new Error('useToast must be used inside <ToastProvider>.');
  return toast;
}
