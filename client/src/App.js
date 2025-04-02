import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './styles/theme';
import BottomNav from './components/navigation/BottomNav';
import MobileContainer from './components/layout/MobileContainer';
import { Box } from '@mui/material';
import LandingScreen from './components/screens/LandingScreen';
import './App.css';

// Auth Flow
import AuthScreen from './components/screens/AuthScreen';
import AuraQuestionnaire from './components/screens/AuraQuestionnaire';
import SignupScreen from './components/screens/SignupScreen';

// Main App
import DashboardScreen from './components/screens/DashboardScreen';
import DiscoverScreen from './components/screens/DiscoverScreen';
import CollectionsScreen from './components/screens/CollectionsScreen';
import AboutAurasScreen from './components/screens/AboutAurasScreen';

function App() {


  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className="app">
          <Routes>
            {/* Auth Flow */}
            <Route path="/" element={<LandingScreen />} />
            <Route path="/auth" element={<AuthScreen />} />
            <Route path="/signup" element={<SignupScreen />} />
            <Route path="/auth/:userId/dashboard" element={<DashboardScreen />} />
            <Route path="/auth/:userId/questionnaire" element={<AuraQuestionnaire/>} />
            
            {/* Main App */}
            <Route path="/discover" element={<DiscoverScreen />} />
            <Route path="/discover/:userId" element={<DiscoverScreen />} />
            <Route path="/collections" element={<CollectionsScreen />} />
            <Route path="/about-auras" element={<AboutAurasScreen />} />
          </Routes>
          <BottomNav />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
