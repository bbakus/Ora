#!/bin/bash

# This script updates the runtime-config.js file with environment variables

# Get the current URL or use the provided one
DEPLOY_URL=${RENDER_EXTERNAL_URL:-$1}

# If no URL is provided, exit
if [ -z "$DEPLOY_URL" ]; then
    echo "No deployment URL provided. Using default values."
    exit 0
fi

# Create the runtime config
echo "window.env = {" > ./public/runtime-config.js
echo "  API_URL: '$DEPLOY_URL'" >> ./public/runtime-config.js
echo "};" >> ./public/runtime-config.js

echo "Updated runtime-config.js with API_URL: $DEPLOY_URL" 