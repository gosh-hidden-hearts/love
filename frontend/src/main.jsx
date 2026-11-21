import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

// Register PWA Service Worker for Android & Offline Support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const rawBase = import.meta.env.BASE_URL || '/';
    const baseUrl = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
    const swUrl = `${baseUrl}sw.js`;
    
    navigator.serviceWorker
      .register(swUrl, { scope: baseUrl })
      .then((registration) => {
        console.log('[GOSH PWA] ServiceWorker registered successfully on scope:', registration.scope);
      })
      .catch((error) => {
        console.warn('[GOSH PWA] ServiceWorker registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
