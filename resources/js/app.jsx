import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth';
import AppRouter from './AppRouter';
import ErrorBoundary from './components/ErrorBoundary';
import { BASE_PATH } from './utils/basePath';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

const container = document.getElementById('app');
const root = createRoot(container);

root.render(
    <React.StrictMode>
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter basename={BASE_PATH}>
                    <AuthProvider>
                        <AppRouter />
                    </AuthProvider>
                </BrowserRouter>
            </QueryClientProvider>
        </ErrorBoundary>
    </React.StrictMode>
);
