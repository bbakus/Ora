#!/bin/bash

# This script removes sensitive files from git history
echo "WARNING: This script will rewrite git history. All team members need to re-clone afterwards."
echo "Make sure you've backed up any important changes first."
echo "Press Ctrl+C to cancel or Enter to continue"
read

# Delete any build files that may contain API keys
echo "Removing build directory..."
rm -rf client/build/

# Commit the removal of build files
git add -A
git commit -m "Remove build directory with sensitive keys"

# Make sure the .gitignore is updated to exclude sensitive files
echo "Checking if .gitignore is properly set up..."
grep -q "client/.env" .gitignore || echo "WARNING: .gitignore may not be properly configured"

# Find current directory for mirror clone
CURRENT_DIR=$(pwd)
PARENT_DIR=$(dirname "$CURRENT_DIR")
REPO_NAME=$(basename "$CURRENT_DIR")

# Clean up old API keys using BFG (requires installation)
echo "Cleaning API keys from repository history..."

# Clone a fresh mirror of the repository
cd "$PARENT_DIR"
git clone --mirror "$CURRENT_DIR" "$REPO_NAME.git"
cd "$REPO_NAME.git"

# Remove sensitive files and replace API keys
# Replace the pattern below with your actual API key pattern
# This will replace any occurrence of the API key with "API_KEY_REMOVED"
echo "AIzaSyApqLTebKHFgwbXJUm_Jf45yelcPMfrXck" > patterns.txt
echo "AIzaSyB456VfsdMUrWJVV9aLiaVn7bVcwy6EEMc" >> patterns.txt # include new key too in case of accidental commit

# Use BFG to clean up
if command -v bfg > /dev/null; then
    bfg --replace-text patterns.txt
    echo "API keys replaced with placeholder in history"
    
    # Clean up repository
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
    
    # Push changes (this will require force push)
    echo "To complete the cleanup, run these commands:"
    echo "cd $PARENT_DIR/$REPO_NAME.git"
    echo "git push --force"
else
    echo "BFG not found. Install with 'brew install bfg' (Mac) or download from:"
    echo "https://rtyley.github.io/bfg-repo-cleaner/"
    exit 1
fi

# Clean up sensitive files
rm patterns.txt

echo ""
echo "Done preparing the repository mirror."
echo ""
echo "IMPORTANT NEXT STEPS:"
echo "1. Change directory to the mirror: cd $PARENT_DIR/$REPO_NAME.git"
echo "2. Force push: git push --force"
echo "3. Delete the mirror after pushing: cd .. && rm -rf $REPO_NAME.git"
echo "4. Return to your original repo: cd $CURRENT_DIR"
echo ""
echo "All team members must now re-clone the repository!"
echo "IMMEDIATELY revoke the old API key in Google Cloud Console!" 