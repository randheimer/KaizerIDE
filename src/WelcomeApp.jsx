import React from 'react';
import TitleBar from './components/Layout/TitleBar';
import WelcomeScreen from './components/Welcome/WelcomeScreen';
import './index.css';

function WelcomeApp() {
  return (
    <div className="app">
      <TitleBar hideMenu={true} />
      <WelcomeScreen />
    </div>
  );
}

export default WelcomeApp;
