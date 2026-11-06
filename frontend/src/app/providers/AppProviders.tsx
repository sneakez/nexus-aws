import { useEffect, useState, type ReactNode } from 'react';
import { AuthProvider } from '@/providers/AuthProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

export function AppProviders({ children }: { children: ReactNode }) {
  const [storageError, setStorageError] = useState('');
  useEffect(() => {
    const listener = (event: Event) => setStorageError((event as CustomEvent<string>).detail);
    window.addEventListener('nexus-storage-error', listener);
    return () => window.removeEventListener('nexus-storage-error', listener);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          {storageError && <p role="alert" className="fixed top-0 left-0 right-0 z-[100] bg-rose-100 text-rose-900 p-4">{storageError}</p>}
          {children}
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
