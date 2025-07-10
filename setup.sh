#!/bin/bash

# Project Drishti Free - One-Click Setup Script
# 100% Free & Open Source Deployment

set -e

echo "🚀 Project Drishti Free - One-Click Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}This script should not be run as root${NC}"
   exit 1
fi

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        echo "Visit: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_warning "Docker not found. Installing Docker is recommended for easier deployment."
        echo "Would you like to continue without Docker? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo "Please install Docker first: https://docs.docker.com/get-docker/"
            exit 1
        fi
        DOCKER_AVAILABLE=false
    else
        DOCKER_AVAILABLE=true
        print_success "Docker found: $(docker --version)"
    fi
    
    # Check available memory
    if command -v free &> /dev/null; then
        MEMORY_GB=$(free -g | awk '/^Mem:/{print $2}')
        if [ "$MEMORY_GB" -lt 8 ]; then
            print_warning "Less than 8GB RAM detected. Performance may be limited."
        fi
    fi
    
    print_success "System requirements check completed"
}

# Setup project
setup_project() {
    print_status "Setting up Project Drishti..."
    
    # Create necessary directories
    mkdir -p data logs uploads models
    
    # Copy free version package.json
    if [ -f "package-free.json" ]; then
        cp package-free.json package.json
        print_success "Using free version configuration"
    fi
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm install
    
    # Create environment file
    if [ ! -f ".env" ]; then
        print_status "Creating environment configuration..."
        cat > .env << EOF
# Project Drishti Free Configuration
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:3000

# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# Database
DATABASE_PATH=./data/drishti.db

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/drishti.log

# OpenCV
OPENCV_THREADS=4

# Security
JWT_SECRET=$(openssl rand -base64 32)
BCRYPT_ROUNDS=12

# Optional: Free tier services
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# Twilio Free Tier (optional)
# TWILIO_ACCOUNT_SID=your-account-sid
# TWILIO_AUTH_TOKEN=your-auth-token
# TWILIO_PHONE_NUMBER=your-twilio-number
EOF
        print_success "Environment file created"
    fi
}

# Setup Ollama
setup_ollama() {
    if [ "$DOCKER_AVAILABLE" = true ]; then
        print_status "Setting up Ollama with Docker..."
        
        # Pull and run Ollama
        docker pull ollama/ollama:latest
        
        # Start Ollama container
        docker run -d \
            --name drishti-ollama \
            -p 11434:11434 \
            -v ollama_data:/root/.ollama \
            --restart unless-stopped \
            ollama/ollama:latest
        
        # Wait for Ollama to start
        print_status "Waiting for Ollama to start..."
        sleep 10
        
        # Pull the model
        print_status "Downloading AI model (this may take a few minutes)..."
        docker exec drishti-ollama ollama pull llama3.1:8b
        
        print_success "Ollama setup completed"
    else
        print_status "Please install Ollama manually:"
        echo "1. Visit: https://ollama.ai/"
        echo "2. Download and install Ollama"
        echo "3. Run: ollama pull llama3.1:8b"
        echo ""
        echo "Press Enter when Ollama is installed and the model is downloaded..."
        read -r
    fi
}

# Build frontend
build_frontend() {
    print_status "Building frontend..."
    npm run build
    print_success "Frontend built successfully"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    node -e "
        const Database = require('./server/utils/Database');
        const db = new Database();
        db.initialize().then(() => {
            console.log('Database initialized successfully');
            process.exit(0);
        }).catch(err => {
            console.error('Database setup failed:', err);
            process.exit(1);
        });
    "
    print_success "Database setup completed"
}

# Create systemd service (Linux only)
create_service() {
    if [[ "$OSTYPE" == "linux-gnu"* ]] && command -v systemctl &> /dev/null; then
        echo ""
        echo "Would you like to create a systemd service for auto-start? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            print_status "Creating systemd service..."
            
            sudo tee /etc/systemd/system/drishti.service > /dev/null << EOF
[Unit]
Description=Project Drishti Free - AI Situational Awareness
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(which node) server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
            
            sudo systemctl daemon-reload
            sudo systemctl enable drishti
            print_success "Systemd service created. Use 'sudo systemctl start drishti' to start"
        fi
    fi
}

# Main setup function
main() {
    echo -e "${GREEN}"
    cat << "EOF"
    ____            _     _     _   _ 
   |  _ \ _ __ ___ (_) __| |___| |_(_)
   | | | | '__/ _ \| |/ _` / __| __| |
   | |_| | | | (_) | | (_| \__ \ |_| |
   |____/|_|  \___/|_|\__,_|___/\__|_|
                                      
   🆓 100% Free & Open Source
   🔒 Privacy-First (All Local Processing)
   🚀 No Billing Required Ever
EOF
    echo -e "${NC}"
    
    check_requirements
    setup_project
    setup_ollama
    build_frontend
    setup_database
    create_service
    
    echo ""
    print_success "🎉 Project Drishti Free setup completed!"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Start the application:"
    if [ "$DOCKER_AVAILABLE" = true ]; then
        echo "   ${GREEN}docker-compose up -d${NC}  (recommended)"
        echo "   OR"
    fi
    echo "   ${GREEN}npm run dev${NC}"
    echo ""
    echo "2. Open your browser:"
    echo "   ${GREEN}http://localhost:3000${NC} - Dashboard"
    echo "   ${GREEN}http://localhost:3001/api/health${NC} - API Health Check"
    echo ""
    echo "3. Check the documentation:"
    echo "   ${GREEN}./docs/${NC} - Setup guides and examples"
    echo ""
    echo -e "${YELLOW}Hardware recommendations:${NC}"
    echo "• Minimum: 8GB RAM, 4-core CPU"
    echo "• Recommended: 16GB RAM, 8-core CPU"
    echo "• GPU: Optional but improves performance"
    echo ""
    echo -e "${BLUE}Support:${NC}"
    echo "• GitHub: https://github.com/project-drishti/drishti-free"
    echo "• Documentation: ./FREE_VERSION_README.md"
    echo ""
    print_success "Happy monitoring! 🎯"
}

# Run main function
main "$@"
