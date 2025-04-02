import React from 'react';
import { Box } from '@mui/material';

const MobileContainer = ({ children }) => {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100vw',
        minHeight: '100vh',
        position: 'relative',
        overflowX: 'hidden',
        backgroundColor: 'background.default',
        // Prevent overscroll behavior
        overscrollBehavior: 'none',
        // Ensure content doesn't get hidden behind mobile browser UI
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {children}
    </Box>
  );
};

export default MobileContainer; 