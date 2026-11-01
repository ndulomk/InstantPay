import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from './app';
import { queryClient } from './lib/query-client';
import { ThemeProvider } from './hooks/theme-context';
import { ErrorBoundary } from './components/feedback/error-boundary';
import './styles.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Elemento #root não encontrado');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
