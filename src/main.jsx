import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import WelcomeApp from './WelcomeApp';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import './styles/tokens.css';
import './index.css';

// Check if we're in welcome mode via hash
const isWelcomeMode = window.location.hash === '#welcome';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary title="KaizerIDE crashed" message="An unexpected error occurred. You can try reloading the window.">
      {isWelcomeMode ? <WelcomeApp /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
);
