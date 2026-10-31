import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Failed to find the root element 'root' in the DOM.");
} else {
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Critical error rendering React application:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; color: #ef4444; background: #030712; font-family: monospace; height: 100vh;">
        <h3>React Render Error</h3>
        <p>${error instanceof Error ? error.message : String(error)}</p>
      </div>
    `;
  }
}