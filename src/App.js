import React, { useState } from 'react';
import MapScreen from './screens/MapScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import './App.css';

export default function App() {
  const [screen, setScreen] = useState('onboarding');
  return (
    <div className="app-root">
      {screen === 'onboarding' && (
        <OnboardingScreen onStart={() => setScreen('map')} />
      )}
      {screen === 'map' && <MapScreen />}
    </div>
  );
}
