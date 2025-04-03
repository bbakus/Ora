import React from 'react';
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

function App() {
  console.log("App rendered, available routes:");

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
              
              {/* Main App */}
              <Route path="/discover" element={<DiscoverScreen />} />
              <Route path="/discover/:userId" element={<DiscoverScreen />} />
              <Route path="/collections" element={<CollectionsScreen />} />
              <Route path="/about-auras" element={<AboutAurasScreen />} />
            </Routes>
          </Box>
        </MobileContainer>
      </Router>
    </ThemeProvider>
  );
}

export default App;
