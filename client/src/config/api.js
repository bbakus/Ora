// API configuration
// This file centralizes API URL configuration for easy updates when deploying

// Use environment variable if available, otherwise use localhost for development
const API_BASE_URL = process.env.REACT_APP_API_URL || window.env?.API_URL || 'http://localhost:5001';

console.log('API base URL:', API_BASE_URL);

export default API_BASE_URL; 