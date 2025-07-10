#!/usr/bin/env python3
"""
Project Drishti - Streamlit Deployment Script
Automated deployment and setup for the Streamlit dashboard
"""

import os
import subprocess
import sys
import time
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3.8, 0):
        print("❌ Python 3.8 or higher is required")
        return False
    print(f"✅ Python {sys.version.split()[0]} detected")
    return True

def install_requirements():
    """Install required packages"""
    print("📦 Installing required packages...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ All packages installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install packages: {e}")
        return False

def check_backend_server():
    """Check if backend server is running"""
    import requests
    try:
        response = requests.get("http://localhost:3001/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend server is running")
            return True
        else:
            print("⚠️ Backend server responded with error")
            return False
    except requests.exceptions.RequestException:
        print("⚠️ Backend server is not running")
        print("💡 The Streamlit app will run in offline mode")
        return False

def start_backend_server():
    """Start the Node.js backend server"""
    print("🚀 Starting backend server...")
    try:
        # Check if Node.js is installed
        subprocess.check_call(["node", "--version"], stdout=subprocess.DEVNULL)
        
        # Start the server in background
        process = subprocess.Popen(
            ["npm", "start"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=Path.cwd()
        )
        
        # Wait a moment for server to start
        time.sleep(3)
        
        if process.poll() is None:
            print("✅ Backend server started successfully")
            return process
        else:
            print("❌ Failed to start backend server")
            return None
            
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Node.js not found. Please install Node.js first")
        return None

def create_streamlit_config():
    """Create Streamlit configuration"""
    config_dir = Path.home() / ".streamlit"
    config_dir.mkdir(exist_ok=True)
    
    config_content = """
[general]
developmentMode = false

[server]
headless = false
enableCORS = false
enableXsrfProtection = false
maxUploadSize = 200

[browser]
gatherUsageStats = false

[theme]
primaryColor = "#1a73e8"
backgroundColor = "#ffffff"
secondaryBackgroundColor = "#f0f2f6"
textColor = "#262730"
"""
    
    config_file = config_dir / "config.toml"
    with open(config_file, "w") as f:
        f.write(config_content.strip())
    
    print("✅ Streamlit configuration created")

def main():
    """Main deployment function"""
    print("🎯 Project Drishti - Streamlit Deployment")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install requirements
    if not install_requirements():
        sys.exit(1)
    
    # Create Streamlit config
    create_streamlit_config()
    
    # Check backend server
    backend_running = check_backend_server()
    
    if not backend_running:
        print("\n🔧 Backend Server Setup")
        print("To start the backend server manually:")
        print("1. Open a new terminal")
        print("2. Navigate to this directory")
        print("3. Run: npm install")
        print("4. Run: npm start")
        print("\nOr run this script with --start-backend flag")
    
    print("\n🚀 Starting Streamlit Dashboard...")
    print("Dashboard will be available at: http://localhost:8501")
    print("Press Ctrl+C to stop the application")
    print("=" * 50)
    
    # Start Streamlit
    try:
        subprocess.run([
            sys.executable, "-m", "streamlit", "run", "streamlit_app.py",
            "--server.port", "8501",
            "--server.address", "localhost"
        ])
    except KeyboardInterrupt:
        print("\n👋 Shutting down Streamlit dashboard...")
    except Exception as e:
        print(f"❌ Error starting Streamlit: {e}")

if __name__ == "__main__":
    if "--start-backend" in sys.argv:
        backend_process = start_backend_server()
        if backend_process:
            try:
                main()
            finally:
                print("🛑 Stopping backend server...")
                backend_process.terminate()
        else:
            print("❌ Could not start backend server")
            sys.exit(1)
    else:
        main()
