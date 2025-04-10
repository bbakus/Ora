import React, { useEffect, createContext, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './styles/theme';
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
import AuraGuideScreen from './components/screens/AuraGuideScreen';
import DailyMoodQuestionnaire from './components/screens/DailyMood/DailyMoodQuestionnaire';

import { loadSansationFont } from './components/utils/FontLoader';

// Create a simple context for the app
export const AppContext = createContext(null);

function App() {
  // Add a simple state for the context
  const [appState, setAppState] = useState({
    theme: 'dark',
    // Add any other global state you might want to share
  });

  console.log("App rendered, available routes:");
  
  // Load the custom font and Material Icons when the component mounts
  useEffect(() => {
    // Load fonts immediately
    loadSansationFont();
  
  }, []);

  // Force medium animation speed for any existing user data
  useEffect(() => {
    // Fix localStorage if it exists
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        
        // Log aura color data for debugging
        console.log("USER AURA DATA:", {
          aura_color: userData.aura_color,
          aura_shape: userData.aura_shape,
          aura_color1: userData.aura_color1,
          aura_color2: userData.aura_color2, 
          aura_color3: userData.aura_color3,
          has3Colors: userData.aura_color && userData.aura_color.includes('gradient') && 
                      userData.aura_color.match(/#[0-9A-Fa-f]{6}/g)?.length === 3
        });
        
        // Force response_speed to 'medium'
        userData.response_speed = 'medium';
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('FORCED USER ANIMATION SPEED TO MEDIUM');
      }
    } catch (error) {
      console.error('Error fixing animation speed:', error);
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppContext.Provider value={{ appState, setAppState }}>
        <Router>
          <MobileContainer>
            <Box sx={{ 
              width: '100%', 
              minHeight: '100vh',
              backgroundColor: '#121212',
              color: '#f5f5f5',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Routes>
                {/* Auth Flow */}
                <Route path="/" element={<LandingScreen />} />
                <Route path="/auth" element={<AuthScreen />} />
                <Route path="/signup" element={<SignupScreen />} />
                <Route path="/auth/:userId/dashboard" element={<DashboardScreen />} />
                <Route path="/auth/:userId/questionnaire" element={<AuraQuestionnaire/>} />
                <Route path="/auth/:userId/daily-mood" element={<DailyMoodQuestionnaire />} />
                
                {/* Main App */}
                <Route path="/discover" element={<DiscoverScreen />} />
                <Route path="/discover/:userId" element={<DiscoverScreen />} />
                <Route path="/collections" element={<CollectionsScreen />} />
                <Route path="/about-auras" element={<AboutAurasScreen />} />
                <Route path="/aura-guide" element={<AuraGuideScreen />} />
              </Routes>
            </Box>
          </MobileContainer>
        </Router>
      </AppContext.Provider>
    </ThemeProvider>
  );
}

export default App;
