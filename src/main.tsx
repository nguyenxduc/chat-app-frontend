import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import App from './app/App.tsx';
import { AuthProvider } from './app/context/AuthContext';
import { configureChatFocusManager, RealtimeProvider } from './app/context/RealtimeContext';
import './styles/index.css';

configureChatFocusManager();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5_000,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RealtimeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </RealtimeProvider>
    </AuthProvider>
  </QueryClientProvider>,
);
