#!/bin/bash

# Project Drishti - Startup Script
echo "🎯 Starting Project Drishti - AI Situational Awareness Platform"
echo "=============================================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env file from template..."
    
    if [ -f ".env.template" ]; then
        cp .env.template .env
        echo "✅ .env file created from template"
        echo ""
        echo "🔧 IMPORTANT: Please edit .env file and add your API keys:"
        echo "   - GOOGLE_CLOUD_PROJECT"
        echo "   - GEMINI_API_KEY" 
        echo "   - GOOGLE_MAPS_API_KEY"
        echo "   - FIREBASE_PROJECT_ID (optional)"
        echo ""
        echo "📖 Then run: npm start"
        exit 1
    else
        echo "❌ .env.template not found!"
        exit 1
    fi
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "⚠️  Node.js version 16+ required. Current version: $(node -v)"
    echo "Please upgrade Node.js: https://nodejs.org/"
    exit 1
fi

# Create logs directory
mkdir -p logs

# Start the server
echo "🚀 Starting Project Drishti server..."
echo "📊 Dashboard will be available at: http://localhost:3001"
echo "🔍 Health check: http://localhost:3001/api/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=============================================================="

npm start
