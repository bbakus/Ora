#!/usr/bin/env node

/**
 * This script finds and replaces all instances of localhost:5001 with the 
 * production URL in built JavaScript files
 */

const fs = require('fs');
const path = require('path');

// Get production URL from environment or use default
const PRODUCTION_URL = process.env.REACT_APP_API_URL || 'https://ora-irr0.onrender.com';
const BUILD_DIR = path.join(__dirname, 'build');

console.log(`Patching API URLs to: ${PRODUCTION_URL}`);

// Walk through build directory recursively
function processDirectory(directory) {
  const items = fs.readdirSync(directory);
  
  for (const item of items) {
    const itemPath = path.join(directory, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      processDirectory(itemPath);
    } else if (stats.isFile() && (item.endsWith('.js') || item.endsWith('.html') || item.endsWith('.css'))) {
      patchFile(itemPath);
    }
  }
}

// Replace localhost:5001 in file
function patchFile(filePath) {
  try {
    console.log(`Checking file: ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file has the pattern
    if (content.includes('localhost:5001')) {
      console.log(`Patching file: ${filePath}`);
      
      // Replace all occurrences
      const newContent = content.replace(/http:\/\/localhost:5001/g, PRODUCTION_URL);
      
      // Write back to file
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Patched file: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

// Start the process
processDirectory(BUILD_DIR);
console.log('API URL patching complete!'); 