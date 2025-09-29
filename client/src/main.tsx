import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { StrictMode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

import { AuthProvider } from './context/auth-context';
import { AppContextProvider } from './context/app-context';
import { RankingModalProvider } from './context/ranking-modal-context';

// Import web fonts
const montserrat = document.createElement('link');
montserrat.rel = 'stylesheet';
montserrat.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&display=swap';
document.head.appendChild(montserrat);

const inter = document.createElement('link');
inter.rel = 'stylesheet';
inter.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
document.head.appendChild(inter);

// Add page title
const title = document.createElement('title');
title.textContent = 'SoundOff - Rate & Rank Live Music Sets';
document.head.appendChild(title);

// Set favicon
const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/svg+xml';
favicon.href = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="0.9em" font-size="90">🎵</text></svg>';
document.head.appendChild(favicon);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContextProvider>
          <RankingModalProvider>
            <App />
          </RankingModalProvider>
        </AppContextProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
