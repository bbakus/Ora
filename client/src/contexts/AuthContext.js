import React, { createContext, useContext } from 'react';

// Create the context
const AuthContext = createContext(null);

// Provider component that doesn't interfere with existing authentication
export const AuthProvider = ({ children }) => {
  // This is a placeholder that doesn't modify any existing behavior
  // The actual user state is currently managed through localStorage in the app
  
  return (
    <AuthContext.Provider value={{}}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  return context || {};
};

export default AuthContext; 