#!/bin/bash

# Project Drishti - Streamlit Startup Script
echo "🎯 Project Drishti - Starting Streamlit Dashboard"
echo "=================================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed"
    exit 1
fi

# Install requirements if not already installed
echo "📦 Installing/Updating requirements..."
pip3 install -r requirements.txt

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from template..."
    cp .env.template .env
    echo "📝 Please edit .env file with your API keys before running again"
    exit 1
fi

# Check if backend server is running
echo "🔍 Checking backend server..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend server is running"
else
    echo "⚠️  Backend server is not running"
    echo "💡 Starting backend server in background..."
    
    # Check if Node.js is installed
    if command -v node &> /dev/null; then
        # Install npm dependencies if needed
        if [ ! -d "node_modules" ]; then
            echo "📦 Installing Node.js dependencies..."
            npm install
        fi
        
        # Start backend server in background
        npm start &
        BACKEND_PID=$!
        echo "🚀 Backend server started with PID: $BACKEND_PID"
        
        # Wait for server to start
        sleep 5
    else
        echo "❌ Node.js not found. Backend will not be available."
        echo "💡 Install Node.js or run backend manually for full functionality"
    fi
fi

# Start Streamlit
echo "🚀 Starting Streamlit Dashboard..."
echo "📊 Dashboard will be available at: http://localhost:8501"
echo "🛑 Press Ctrl+C to stop"
echo "=================================================="

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    if [ ! -z "$BACKEND_PID" ]; then
        echo "🔴 Stopping backend server..."
        kill $BACKEND_PID 2>/dev/null
    fi
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start Streamlit
python3 -m streamlit run streamlit_app.py --server.port 8501 --server.address localhost

# Cleanup when Streamlit exits
cleanup
