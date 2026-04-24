import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import WelcomeApp from './WelcomeApp';
import './styles/tokens.css';
import './index.css';

// Check if we're in welcome mode via hash
const isWelcomeMode = window.location.hash === '#welcome';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isWelcomeMode ? <WelcomeApp /> : <App />}
  </React.StrictMode>
);
