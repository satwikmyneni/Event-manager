# Project Drishti - Streamlit Dashboard

## 🎯 Overview

This is a comprehensive Streamlit web application for Project Drishti, providing an intuitive dashboard interface for the AI-powered situational awareness platform. The dashboard integrates all core features including crowd analysis, emergency dispatch, anomaly detection, and missing person search.

## 🚀 Features

### 📊 Real-Time Dashboard
- Live system metrics and status monitoring
- Interactive maps with camera and incident markers
- Real-time alerts and notifications
- System performance analytics

### 🔮 Predictive Crowd Analysis
- AI-powered crowd dynamics analysis
- 15-20 minute bottleneck predictions
- Density monitoring and flow analysis
- Historical trend visualization

### 🧠 AI Situational Intelligence
- Natural language query processing
- Comprehensive situational summaries
- Threat assessment and recommendations
- Multi-source data integration

### 🚨 Emergency Dispatch System
- Intelligent resource allocation
- Optimized routing with Google Maps
- Real-time unit tracking
- Protocol-based response procedures

### 👁️ Anomaly Detection
- Multimodal threat detection
- Real-time security monitoring
- Confidence scoring and severity assessment
- Automated alert generation

### 🔍 Missing Person Search
- AI-powered facial recognition
- Cross-camera network search
- Urgency-based prioritization
- Real-time match notifications

## 📋 Prerequisites

### System Requirements
- Python 3.8 or higher
- Node.js 16.0 or higher (for backend)
- 4GB RAM minimum
- Internet connection for maps and AI services

### API Keys Required
- **Gemini API Key**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Google Maps API Key**: Get from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- **Firebase Configuration**: Get from [Firebase Console](https://console.firebase.google.com/) (optional)

## 🛠️ Installation & Setup

### Method 1: Automated Setup (Recommended)

1. **Clone and Navigate**
   ```bash
   cd "/mnt/e/1Public safety/project-drishti"
   ```

2. **Run Automated Deployment**
   ```bash
   python deploy_streamlit.py
   ```

3. **With Backend Auto-Start**
   ```bash
   python deploy_streamlit.py --start-backend
   ```

### Method 2: Manual Setup

1. **Install Python Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   ```bash
   # Copy and edit environment file
   cp .env.template .env
   # Edit .env with your API keys
   ```

3. **Start Backend Server** (in separate terminal)
   ```bash
   npm install
   npm start
   ```

4. **Start Streamlit Dashboard**
   ```bash
   streamlit run streamlit_app.py --server.port 8501
   ```

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
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app

# Server Configuration
PORT=3001
NODE_ENV=development
```

### Streamlit Configuration
The deployment script automatically creates a `.streamlit/config.toml` file with optimized settings.

## 🌐 Usage

### Accessing the Dashboard
- **Streamlit Dashboard**: http://localhost:8501
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health

### Navigation
1. **Dashboard Tab**: Overview of system status and live metrics
2. **Crowd Analysis**: Analyze crowd dynamics and predict bottlenecks
3. **AI Summary**: Generate situational intelligence reports
4. **Emergency Dispatch**: Manage emergency response and resource allocation
5. **Anomaly Detection**: Monitor for security threats and anomalies
6. **Missing Person**: Search for missing individuals across camera network

### Key Features

#### Interactive Map
- View camera locations and status
- See active incidents and emergencies
- Click markers for detailed information
- Real-time updates

#### Auto-Refresh
- Enable auto-refresh for live updates
- 30-second refresh interval
- Manual refresh option available

#### Offline Mode
- Dashboard works even when backend is offline
- Shows sample data for demonstration
- Graceful error handling

## 🔍 API Integration

The Streamlit app communicates with the Node.js backend through REST API calls:

### Available Endpoints
- `GET /api/health` - System health check
- `GET /api/dashboard` - Dashboard data
- `POST /api/analyze-crowd-dynamics` - Crowd analysis
- `POST /api/situational-summary` - AI summaries
- `POST /api/emergency-incident` - Emergency dispatch
- `POST /api/detect-anomalies` - Anomaly detection
- `POST /api/missing-person` - Missing person search

### Error Handling
- Automatic retry for failed requests
- Graceful degradation when backend is unavailable
- User-friendly error messages
- Offline mode with sample data

## 📊 Data Visualization

### Charts and Graphs
- **Plotly Integration**: Interactive charts and graphs
- **Real-time Updates**: Live data visualization
- **Historical Trends**: Time-series analysis
- **Comparative Analytics**: Multi-metric comparisons

### Map Integration
- **Folium Maps**: Interactive mapping with markers
- **Camera Locations**: Visual representation of surveillance network
- **Incident Tracking**: Real-time incident visualization
- **Route Optimization**: Emergency response routing

## 🔒 Security Features

### Data Protection
- No sensitive data stored locally
- API key encryption in environment variables
- Secure communication with backend
- Session-based authentication ready

### Access Control
- Role-based access control ready
- Audit logging capabilities
- Secure API endpoints
- CORS protection

## 🚀 Deployment Options

### Local Development
```bash
streamlit run streamlit_app.py
```

### Production Deployment
```bash
streamlit run streamlit_app.py --server.port 8501 --server.address 0.0.0.0
```

### Docker Deployment (Optional)
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8501
CMD ["streamlit", "run", "streamlit_app.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

## 🐛 Troubleshooting

### Common Issues

1. **Backend Connection Failed**
   - Ensure Node.js server is running on port 3001
   - Check firewall settings
   - Verify API endpoints are accessible

2. **Map Not Loading**
   - Verify Google Maps API key is valid
   - Check API key permissions and billing
   - Ensure internet connection is stable

3. **Streamlit Import Errors**
   - Run `pip install -r requirements.txt`
   - Check Python version compatibility
   - Verify virtual environment activation

4. **Performance Issues**
   - Disable auto-refresh if not needed
   - Reduce chart update frequency
   - Check system resources

### Debug Mode
Enable debug logging by setting:
```bash
export STREAMLIT_LOGGER_LEVEL=debug
```

## 📈 Performance Optimization

### Best Practices
- Use `@st.cache_data` for expensive computations
- Implement pagination for large datasets
- Optimize API call frequency
- Use session state for persistent data

### Resource Management
- Monitor memory usage
- Implement data cleanup
- Use efficient data structures
- Optimize chart rendering

## 🔄 Updates and Maintenance

### Regular Updates
- Keep dependencies updated
- Monitor API changes
- Update security configurations
- Review performance metrics

### Backup and Recovery
- Regular configuration backups
- API key rotation procedures
- Data export capabilities
- Disaster recovery planning

## 📞 Support

### Getting Help
- Check the troubleshooting section
- Review API documentation
- Check system logs
- Contact development team

### Contributing
- Follow coding standards
- Add comprehensive tests
- Update documentation
- Submit pull requests

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Project Drishti** - AI-Powered Situational Awareness Platform
Built with ❤️ using Streamlit, Node.js, and Google AI Technologies
