#!/bin/bash

# Project Drishti - GitHub Repository Setup Script
echo "🎯 Project Drishti - GitHub Repository Setup"
echo "=============================================="

# Set repository URL
REPO_URL="https://github.com/i-suhas/project-drishti.git"
REPO_NAME="project-drishti"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

echo "✅ Git is installed"

# Initialize git repository if not already initialized
if [ ! -d ".git" ]; then
    echo "🔧 Initializing Git repository..."
    git init
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already exists"
fi

# Create .gitignore file
echo "📝 Creating .gitignore file..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# PyInstaller
*.manifest
*.spec

# Installer logs
pip-log.txt
pip-delete-this-directory.txt

# Unit test / coverage reports
htmlcov/
.tox/
.nox/
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
.hypothesis/
.pytest_cache/

# Jupyter Notebook
.ipynb_checkpoints

# IPython
profile_default/
ipython_config.py

# pyenv
.python-version

# celery beat schedule file
celerybeat-schedule

# SageMath parsed files
*.sage.py

# Environments
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

# Spyder project settings
.spyderproject
.spyproject

# Rope project settings
.ropeproject

# mkdocs documentation
/site

# mypy
.mypy_cache/
.dmypy.json
dmypy.json

# Streamlit
.streamlit/

# Firebase
.firebase/
firebase-debug.log
firestore-debug.log

# Service account keys (keep secure)
config/service-account-key.json

# Local development files
*.local
.cache/
EOF

echo "✅ .gitignore file created"

# Create a comprehensive README.md
echo "📝 Creating README.md..."
cat > README.md << 'EOF'
# 🎯 Project Drishti - AI Situational Awareness Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.8%2B-blue)](https://python.org/)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.28%2B-red)](https://streamlit.io/)

## 🌟 Overview

Project Drishti is an advanced AI-powered situational awareness platform designed for public safety and emergency response. It combines cutting-edge artificial intelligence, real-time data processing, and intuitive user interfaces to provide comprehensive security monitoring and intelligent response coordination.

## 🚀 Key Features

### 🔮 Predictive Bottleneck Analysis
- **AI-Powered Crowd Dynamics**: Advanced computer vision for real-time crowd analysis
- **15-20 Minute Predictions**: Early warning system for potential bottlenecks
- **Proactive Recommendations**: Automated suggestions for crowd management

### 🧠 AI Situational Intelligence
- **Natural Language Processing**: Query-based situational summaries
- **Multi-Source Integration**: Combines video, sensor, and social media data
- **Threat Assessment**: Automated risk evaluation and prioritization

### 🚨 Intelligent Emergency Dispatch
- **Smart Resource Allocation**: AI-optimized unit deployment
- **Route Optimization**: Google Maps integration for fastest response
- **Protocol Automation**: Standardized emergency response procedures

### 👁️ Multimodal Anomaly Detection
- **Advanced Computer Vision**: Real-time threat detection
- **Behavioral Analysis**: Suspicious activity identification
- **Confidence Scoring**: Reliability metrics for all detections

### 🔍 Missing Person Search
- **Facial Recognition**: AI-powered person identification
- **Cross-Camera Network**: Comprehensive surveillance coverage
- **Real-Time Alerts**: Immediate notification system

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Streamlit     │    │    Node.js      │    │   Google AI     │
│   Dashboard     │◄──►│   Backend       │◄──►│   Services      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │    Firebase     │    │  Google Maps    │
│   Interface     │    │    Database     │    │     API         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Technology Stack

### Backend
- **Node.js**: High-performance server runtime
- **Express.js**: Web application framework
- **Google Gemini AI**: Advanced language and vision models
- **Google Maps API**: Location services and routing

### Frontend
- **Streamlit**: Interactive web application framework
- **Plotly**: Advanced data visualization
- **Folium**: Interactive mapping
- **Pandas**: Data manipulation and analysis

### Cloud Services
- **Firebase**: Real-time database and authentication
- **Google Cloud**: AI/ML services and infrastructure
- **Vertex AI**: Machine learning platform

## 📋 Prerequisites

### System Requirements
- **Node.js**: Version 16.0 or higher
- **Python**: Version 3.8 or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Network**: Stable internet connection

### API Keys Required
1. **Gemini API Key**: [Get from Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Google Maps API Key**: [Get from Google Cloud Console](https://console.cloud.google.com/apis/credentials)
3. **Firebase Configuration**: [Get from Firebase Console](https://console.firebase.google.com/) (optional)

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/i-suhas/project-drishti.git
cd project-drishti
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.template .env

# Edit .env with your API keys
nano .env
```

### 3. Backend Setup
```bash
# Install Node.js dependencies
npm install

# Run setup check
npm run setup

# Start backend server
npm start
```

### 4. Frontend Setup (New Terminal)
```bash
# Install Python dependencies
pip install -r requirements.txt

# Start Streamlit dashboard
streamlit run streamlit_app.py
```

### 5. Access Applications
- **Streamlit Dashboard**: http://localhost:8501
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/health

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Required API Keys
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Optional Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com

# Server Configuration
PORT=3001
NODE_ENV=development
HOST=localhost
```

## 📊 API Endpoints

### Core Services
- `GET /api/health` - System health check
- `GET /api/dashboard` - Real-time dashboard data
- `POST /api/analyze-crowd-dynamics` - Crowd analysis
- `POST /api/situational-summary` - AI situational intelligence
- `POST /api/emergency-incident` - Emergency dispatch
- `POST /api/detect-anomalies` - Anomaly detection
- `POST /api/missing-person` - Missing person search

### Example Usage
```javascript
// Crowd Analysis
const response = await fetch('/api/analyze-crowd-dynamics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoFeed: { mockData: true },
    cameraMetadata: {
      cameraId: 'CAM-001',
      location: 'Main Entrance',
      coverageAreaSqMeters: 1000
    }
  })
});
```

## 🎨 User Interface

### Streamlit Dashboard Features
- **Real-Time Monitoring**: Live system metrics and alerts
- **Interactive Maps**: Camera locations and incident tracking
- **AI Analysis Tools**: Crowd dynamics and threat assessment
- **Emergency Management**: Dispatch coordination and tracking
- **Search Capabilities**: Missing person identification

### Key UI Components
- Responsive design for desktop and mobile
- Real-time data visualization with Plotly
- Interactive maps with Folium
- Auto-refresh capabilities
- Offline mode support

## 🔒 Security Features

### Data Protection
- Environment variable encryption
- Secure API communication
- No sensitive data in repositories
- Session-based authentication ready

### Access Control
- Role-based permissions (ready for implementation)
- API rate limiting
- CORS protection
- Audit logging capabilities

## 📈 Performance Optimization

### Backend Optimizations
- Efficient API response caching
- Concurrent request handling
- Memory usage optimization
- Database query optimization

### Frontend Optimizations
- Lazy loading for large datasets
- Efficient chart rendering
- Optimized API call patterns
- Resource cleanup procedures

## 🧪 Testing

### Backend Testing
```bash
# Run API tests
npm test

# Test specific endpoints
node test-apis.js
```

### Frontend Testing
```bash
# Test Streamlit components
python -m pytest tests/

# Manual testing
streamlit run streamlit_app.py
```

## 🚀 Deployment

### Local Development
```bash
# Start both services
./start_streamlit.sh
```

### Production Deployment
```bash
# Backend
npm run build
npm run start:prod

# Frontend
streamlit run streamlit_app.py --server.port 8501 --server.address 0.0.0.0
```

### Docker Deployment
```bash
# Build and run containers
docker-compose up -d
```

## 📚 Documentation

- [**Streamlit Setup Guide**](README_STREAMLIT.md) - Detailed frontend setup
- [**API Documentation**](docs/API.md) - Complete API reference
- [**Deployment Guide**](docs/DEPLOYMENT.md) - Production deployment
- [**Configuration Guide**](docs/CONFIGURATION.md) - Advanced settings

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

### Code Standards
- Follow ESLint configuration for JavaScript
- Use Black formatter for Python
- Add comprehensive documentation
- Include unit tests

## 🐛 Troubleshooting

### Common Issues
1. **Backend Connection Failed**: Check if Node.js server is running
2. **API Key Errors**: Verify API keys in .env file
3. **Map Loading Issues**: Check Google Maps API key and billing
4. **Performance Issues**: Monitor system resources

### Debug Mode
```bash
# Enable debug logging
export DEBUG=drishti:*
npm start

# Streamlit debug mode
export STREAMLIT_LOGGER_LEVEL=debug
streamlit run streamlit_app.py
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google AI Platform for advanced AI capabilities
- Streamlit team for the excellent web framework
- Open source community for various libraries and tools
- Contributors and testers for their valuable feedback

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/i-suhas/project-drishti/issues)
- **Discussions**: [GitHub Discussions](https://github.com/i-suhas/project-drishti/discussions)
- **Email**: [Contact Developer](mailto:your-email@example.com)

---

**Built with ❤️ for Public Safety and Emergency Response**

*Project Drishti - Enhancing situational awareness through artificial intelligence*
EOF

echo "✅ README.md created"

# Add all files to git
echo "📁 Adding files to Git..."
git add .

# Check git status
echo "📊 Git status:"
git status

# Commit changes
echo "💾 Committing changes..."
git commit -m "Initial commit: Project Drishti - AI Situational Awareness Platform

Features:
- Enhanced Node.js backend with Gemini AI integration
- Comprehensive Streamlit dashboard
- Real-time crowd analysis and predictions
- AI-powered situational intelligence
- Intelligent emergency dispatch system
- Multimodal anomaly detection
- Missing person search capabilities
- Interactive maps and data visualization
- Complete API documentation
- Automated deployment scripts

Technologies:
- Node.js + Express.js backend
- Streamlit + Python frontend
- Google Gemini AI integration
- Google Maps API
- Firebase integration
- Plotly data visualization
- Folium interactive maps"

# Add remote origin if not already added
if ! git remote get-url origin &> /dev/null; then
    echo "🔗 Adding remote origin..."
    git remote add origin $REPO_URL
    echo "✅ Remote origin added"
else
    echo "✅ Remote origin already exists"
fi

# Push to GitHub
echo "🚀 Pushing to GitHub..."
echo "Repository: $REPO_URL"

# Check if we need to set upstream
if ! git rev-parse --abbrev-ref --symbolic-full-name @{u} &> /dev/null; then
    echo "📤 Setting upstream and pushing..."
    git push -u origin main
else
    echo "📤 Pushing to existing upstream..."
    git push
fi

echo ""
echo "🎉 SUCCESS! Project Drishti has been uploaded to GitHub!"
echo "=============================================="
echo "📍 Repository URL: $REPO_URL"
echo "🌐 View online: https://github.com/i-suhas/project-drishti"
echo ""
echo "📋 Next Steps:"
echo "1. Visit your GitHub repository"
echo "2. Add API keys to GitHub Secrets (for CI/CD)"
echo "3. Configure branch protection rules"
echo "4. Set up GitHub Pages (if needed)"
echo "5. Add collaborators"
echo ""
echo "🔧 Local Development:"
echo "- Backend: npm start"
echo "- Frontend: streamlit run streamlit_app.py"
echo "- Full Setup: ./start_streamlit.sh"
echo "=============================================="
