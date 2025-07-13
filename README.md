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
git clone https://github.com/satwikmyneni/Event-manager.git
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

## 🙏 Acknowledgments

- Google AI Platform for advanced AI capabilities
- Streamlit team for the excellent web framework
- Open source community for various libraries and tools
- Contributors and testers for their valuable feedback

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/satwikmyneni/Event-manageri/issues)
- **Discussions**: [GitHub Discussions](https://github.com/satwikmyneni/Event-manager/discussions)
- **Email**: [Contact Developer](mailto:mynenisatvik@gmail.com)

---

**Built with ❤️ for Public Safety and Emergency Response**

*Project Drishti - Enhancing situational awareness through artificial intelligence*
