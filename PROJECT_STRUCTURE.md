# 📁 Project Drishti - File Structure

## 🏗️ Project Architecture

```
project-drishti/
├── 📄 README.md                     # Main project documentation
├── 📄 README_STREAMLIT.md           # Streamlit setup guide
├── 📄 README_EXECUTABLE.md          # Executable version guide
├── 📄 README_FREE.md                # Free version guide
├── 📄 PROJECT_STRUCTURE.md          # This file
├── 📄 CHALLENGE_SOLUTION.md         # Challenge requirements solution
├── 📄 PROJECT_SUMMARY.md            # Project overview
├── 📄 LICENSE                       # MIT License
├── 📄 .gitignore                    # Git ignore rules
│
├── 🔧 Configuration Files
│   ├── 📄 .env                      # Environment variables (not in repo)
│   ├── 📄 .env.template             # Environment template
│   ├── 📄 package.json              # Node.js dependencies
│   ├── 📄 package-lock.json         # Dependency lock file
│   ├── 📄 requirements.txt          # Python dependencies
│   ├── 📄 firebase.json             # Firebase configuration
│   ├── 📄 firestore.rules           # Firestore security rules
│   ├── 📄 firestore.indexes.json    # Firestore indexes
│   ├── 📄 next.config.js            # Next.js configuration
│   └── 📄 tailwind.config.js        # Tailwind CSS config
│
├── 🚀 Deployment & Scripts
│   ├── 📄 git_deploy.sh             # GitHub deployment script
│   ├── 📄 start_streamlit.sh        # Streamlit startup script
│   ├── 📄 deploy_streamlit.py       # Streamlit deployment automation
│   ├── 📄 setup.sh                  # Project setup script
│   ├── 📄 setup-check.js            # Configuration validation
│   ├── 📄 start.sh                  # Server startup script
│   └── 📄 server.js                 # Main Node.js server
│
├── 🎨 Frontend (Streamlit)
│   ├── 📄 streamlit_app.py          # Main Streamlit application
│   ├── 📄 streamlit_components.py   # UI components (Dashboard, Analysis)
│   └── 📄 streamlit_components2.py  # UI components (Detection, Search)
│
├── 🔧 Backend Services
│   ├── 📁 agent/                    # AI agent implementations
│   │   ├── 📄 predictive_analyzer.js
│   │   ├── 📄 situational_agent.js
│   │   └── 📄 dispatch_agent.js
│   │
│   ├── 📁 backend/                  # Backend utilities
│   │   ├── 📄 api_handlers.js
│   │   ├── 📄 middleware.js
│   │   └── 📄 utils.js
│   │
│   └── 📁 server/                   # Server components
│       ├── 📄 routes.js
│       ├── 📄 controllers.js
│       └── 📄 models.js
│
├── 🔐 Configuration
│   ├── 📁 config/
│   │   ├── 📄 firebase-config.js    # Firebase configuration
│   │   ├── 📄 api-config.js         # API configurations
│   │   └── 📄 service-account-key.json # Service account (not in repo)
│   │
│   └── 📁 functions/                # Firebase Cloud Functions
│       ├── 📄 index.js
│       ├── 📄 package.json
│       └── 📄 .gitignore
│
├── 🎯 Source Code
│   └── 📁 src/                      # Source components
│       ├── 📄 components.js
│       ├── 📄 utils.js
│       └── 📄 constants.js
│
├── 📚 Documentation
│   └── 📁 docs/
│       ├── 📄 API.md                # API documentation
│       ├── 📄 DEPLOYMENT.md         # Deployment guide
│       ├── 📄 CONFIGURATION.md      # Configuration guide
│       └── 📄 TROUBLESHOOTING.md    # Troubleshooting guide
│
├── 📊 Logs & Data
│   └── 📁 logs/
│       ├── 📄 drishti.log           # Application logs
│       ├── 📄 error.log             # Error logs
│       └── 📄 access.log            # Access logs
│
└── 🔄 CI/CD
    └── 📁 .github/
        └── 📁 workflows/
            └── 📄 ci-cd.yml         # GitHub Actions workflow
```

## 📋 File Descriptions

### 🔧 Core Configuration Files

| File | Purpose | Description |
|------|---------|-------------|
| `package.json` | Node.js config | Dependencies, scripts, and metadata |
| `requirements.txt` | Python deps | Streamlit and Python dependencies |
| `.env` | Environment | API keys and configuration (not in repo) |
| `.env.template` | Env template | Template for environment variables |
| `firebase.json` | Firebase config | Firebase project configuration |

### 🚀 Main Application Files

| File | Purpose | Description |
|------|---------|-------------|
| `server.js` | Backend server | Main Node.js Express server |
| `streamlit_app.py` | Frontend app | Main Streamlit dashboard |
| `streamlit_components.py` | UI components | Dashboard and analysis components |
| `streamlit_components2.py` | UI components | Detection and search components |

### 🛠️ Deployment Scripts

| File | Purpose | Description |
|------|---------|-------------|
| `git_deploy.sh` | GitHub deploy | Automated GitHub repository setup |
| `start_streamlit.sh` | Streamlit start | Streamlit application launcher |
| `deploy_streamlit.py` | Deploy automation | Python deployment script |
| `setup-check.js` | Config validation | Validates API keys and setup |

### 📚 Documentation Files

| File | Purpose | Description |
|------|---------|-------------|
| `README.md` | Main docs | Primary project documentation |
| `README_STREAMLIT.md` | Streamlit guide | Streamlit setup and usage |
| `PROJECT_STRUCTURE.md` | File structure | This file - project organization |
| `CHALLENGE_SOLUTION.md` | Solution docs | Challenge requirements fulfillment |

## 🔍 Key Directories

### 📁 `/agent/` - AI Agents
Contains specialized AI agent implementations:
- **Predictive Analyzer**: Crowd dynamics and bottleneck prediction
- **Situational Agent**: AI-powered situational intelligence
- **Dispatch Agent**: Emergency response coordination

### 📁 `/backend/` - Backend Services
Core backend functionality:
- **API Handlers**: Request processing and response formatting
- **Middleware**: Authentication, logging, error handling
- **Utilities**: Helper functions and common operations

### 📁 `/config/` - Configuration
Configuration files and settings:
- **Firebase Config**: Database and authentication setup
- **API Config**: External service configurations
- **Service Keys**: Authentication credentials (secure)

### 📁 `/functions/` - Cloud Functions
Firebase Cloud Functions for serverless operations:
- **Triggers**: Database and authentication triggers
- **Scheduled Functions**: Periodic maintenance tasks
- **HTTP Functions**: Additional API endpoints

### 📁 `/logs/` - Application Logs
Runtime logs and monitoring:
- **Application Logs**: General application activity
- **Error Logs**: Error tracking and debugging
- **Access Logs**: API access and usage patterns

### 📁 `/.github/` - CI/CD Pipeline
GitHub Actions and automation:
- **Workflows**: Automated testing and deployment
- **Templates**: Issue and PR templates
- **Scripts**: Automation and utility scripts

## 🔐 Security Considerations

### 🚫 Files NOT in Repository
- `.env` - Contains sensitive API keys
- `service-account-key.json` - Firebase service account
- `node_modules/` - Dependencies (installed via npm)
- `logs/*.log` - Runtime logs
- `.streamlit/` - Streamlit cache and config

### ✅ Files in Repository
- `.env.template` - Template without sensitive data
- Configuration files without secrets
- Source code and documentation
- Deployment scripts and automation

## 📦 Dependencies

### Node.js Dependencies (package.json)
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "nodemon": "^3.0.1"
}
```

### Python Dependencies (requirements.txt)
```
streamlit==1.28.1
requests==2.31.0
pandas==2.1.1
plotly==5.17.0
folium==0.14.0
streamlit-folium==0.15.0
```

## 🚀 Getting Started

### 1. Clone Repository
```bash
git clone https://github.com/i-suhas/project-drishti.git
cd project-drishti
```

### 2. Setup Environment
```bash
cp .env.template .env
# Edit .env with your API keys
```

### 3. Install Dependencies
```bash
# Node.js
npm install

# Python
pip install -r requirements.txt
```

### 4. Run Applications
```bash
# Backend
npm start

# Frontend (new terminal)
streamlit run streamlit_app.py
```

## 🔄 Development Workflow

### 1. Feature Development
- Create feature branch from `main`
- Develop and test locally
- Update documentation
- Submit pull request

### 2. Testing
- Backend: `npm test`
- Frontend: Manual testing with Streamlit
- Integration: Full system testing

### 3. Deployment
- Merge to `main` triggers CI/CD
- Automated testing and building
- Deployment to production environment

## 📊 Monitoring & Maintenance

### Log Files
- Monitor `logs/drishti.log` for application events
- Check `logs/error.log` for error tracking
- Review `logs/access.log` for usage patterns

### Performance Monitoring
- API response times
- Memory and CPU usage
- Database query performance
- User interaction metrics

## 🤝 Contributing

### Code Organization
- Follow existing file structure
- Add new features in appropriate directories
- Update documentation for changes
- Include tests for new functionality

### File Naming Conventions
- Use kebab-case for files: `my-component.js`
- Use PascalCase for classes: `MyComponent`
- Use camelCase for functions: `myFunction`
- Use UPPER_CASE for constants: `API_BASE_URL`

---

**Project Drishti** - Organized for scalability, security, and maintainability
