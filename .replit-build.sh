#!/bin/bash
# Replit build script

echo "🚀 Starting Replit deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the Next.js app
echo "🔨 Building Next.js application..."
npm run build

# Start the server
echo "✅ Starting server..."
npm run start