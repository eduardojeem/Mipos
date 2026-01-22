import type { ToastActionElement } from '@/components/ui/toast';
import { toast as shadToast } from '@/components/ui/use-toast';
import type { ReactNode } from 'react';

type ToastVariant = 'default' | 'destructive';

export type ToastOptions = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  action?: ToastActionElement;
};

type MessageOptions = { description?: string };

function showToast(arg: string | ToastOptions) {
  if (typeof arg === 'string') {
    return shadToast({ title: arg, variant: 'default' });
  }
  return shadToast(arg);
}

export const toast = Object.assign(showToast, {
  success(message: string, opts?: MessageOptions) {
    return shadToast({ title: message, description: opts?.description, variant: 'default' });
  },
  error(message: string, opts?: MessageOptions) {
    return shadToast({ title: message, description: opts?.description, variant: 'destructive' });
  },
  info(message: string, opts?: MessageOptions) {
    return shadToast({ title: message, description: opts?.description, variant: 'default' });
  },
  warning(message: string, opts?: MessageOptions) {
    return shadToast({ title: message, description: opts?.description, variant: 'default' });
  },
  show(opts: ToastOptions) {
    return shadToast(opts);
  },
});

export default toast;