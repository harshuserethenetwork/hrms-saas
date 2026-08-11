'use client';

import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from '@/providers';

export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      richColors
      closeButton
      position="top-right"
      duration={4500}
      toastOptions={{
        className: '!rounded-xl !border !shadow-lg !text-sm !font-medium',
      }}
    />
  );
}
