#!/bin/bash

echo "🎮 Online Text Battle - Starting..."
echo "================================"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Set environment variables
export JWT_SECRET=${JWT_SECRET:-"dev-secret-key-for-codespaces"}
export NODE_ENV=${NODE_ENV:-"development"}
export PORT=${PORT:-"3000"}

# Clean up any existing database
rm -f database.sqlite

echo "🔧 Environment variables set"
echo "🚀 Starting development server..."
echo "================================"

# Start the server
npm run dev