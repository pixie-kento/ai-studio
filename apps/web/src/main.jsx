import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { router } from './router/index.jsx';
import useUIStore from './stores/uiStore.js';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoot() {
  const theme = useUIStore((s) => s.theme);
  const initTheme = useUIStore((s) => s.initTheme);

  React.useEffect(() => {
    initTheme();
  }, [initTheme]);

  const isDark = theme === 'dark';

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider
        router={router}
        future={{ v7_startTransition: true }}
      />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            color: isDark ? '#f8fafc' : '#0f172a',
            border: isDark ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: isDark
              ? '0 16px 34px -24px rgba(2, 6, 23, 0.95)'
              : '0 16px 30px -22px rgba(15, 23, 42, 0.24)',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#ffffff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
        }}
      />
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>
);
