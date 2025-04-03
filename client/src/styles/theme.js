import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6200EE',
      light: '#7C4DFF',
      dark: '#4527A0',
    },
    secondary: {
      main: '#03DAC6',
      light: '#64FFDA',
      dark: '#018786',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontSize: '66px',
      fontWeight: 700,
    },
    h2: {
      fontSize: '57px',
      fontWeight: 500,
    },
    h3: {
      fontSize: '47px',
      fontWeight: 500,
    },
    body1: {
      fontSize: '16px',
    },
    body2: {
      fontSize: '14px',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#121212',
          color: '#f5f5f5',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 28,
          padding: '16px 24px',
          fontSize: '47px',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: '#1e1e1e',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
});

export default theme; 