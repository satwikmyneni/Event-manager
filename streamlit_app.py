"""
Project Drishti - Streamlit Dashboard
AI-Powered Situational Awareness Platform
"""

import streamlit as st
import requests
import json
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import time
import os
from dotenv import load_dotenv

# Import components
from streamlit_components import (
    show_interactive_map, show_live_alerts, show_system_metrics,
    show_crowd_analysis, show_ai_summary, show_emergency_dispatch
)
from streamlit_components2 import show_anomaly_detection, show_missing_person

# Load environment variables
load_dotenv()

# Page configuration
st.set_page_config(
    page_title="Project Drishti - AI Situational Awareness",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        background: linear-gradient(90deg, #1a73e8 0%, #4285f4 100%);
        padding: 1rem;
        border-radius: 10px;
        color: white;
        text-align: center;
        margin-bottom: 2rem;
    }
    .metric-card {
        background: white;
        padding: 1rem;
        border-radius: 8px;
        border-left: 4px solid #1a73e8;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .alert-high {
        border-left: 4px solid #f44336;
        background: #ffebee;
        padding: 1rem;
        border-radius: 8px;
        margin: 0.5rem 0;
    }
    .alert-medium {
        border-left: 4px solid #ff9800;
        background: #fff3e0;
        padding: 1rem;
        border-radius: 8px;
        margin: 0.5rem 0;
    }
    .alert-low {
        border-left: 4px solid #4caf50;
        background: #e8f5e8;
        padding: 1rem;
        border-radius: 8px;
        margin: 0.5rem 0;
    }
    .success-message {
        background: #e8f5e8;
        color: #2e7d32;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
    }
    .error-message {
        background: #ffebee;
        color: #c62828;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
    }
    .stTabs [data-baseweb="tab-list"] {
        gap: 2px;
    }
    .stTabs [data-baseweb="tab"] {
        height: 50px;
        padding-left: 20px;
        padding-right: 20px;
    }
</style>
""", unsafe_allow_html=True)

# Configuration
API_BASE_URL = "http://localhost:3001"
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')

class DrishtiAPI:
    """API client for Project Drishti backend"""
    
    def __init__(self, base_url):
        self.base_url = base_url
    
    def health_check(self):
        """Check system health"""
        try:
            response = requests.get(f"{self.base_url}/api/health", timeout=5)
            return response.json()
        except Exception as e:
            return {"error": str(e), "status": "error"}
    
    def get_dashboard_data(self):
        """Get dashboard data"""
        try:
            response = requests.get(f"{self.base_url}/api/dashboard", timeout=10)
            return response.json()
        except Exception as e:
            return {"error": str(e), "success": False}
    
    def analyze_crowd_dynamics(self, camera_data):
        """Analyze crowd dynamics"""
        try:
            response = requests.post(
                f"{self.base_url}/api/analyze-crowd-dynamics",
                json=camera_data,
                timeout=15
            )
            return response.json()
        except Exception as e:
            return {"error": str(e), "success": False}
    
    def generate_situational_summary(self, query_data):
        """Generate AI situational summary"""
        try:
            response = requests.post(
                f"{self.base_url}/api/situational-summary",
                json=query_data,
                timeout=20
            )
            return response.json()
        except Exception as e:
            return {"error": str(e), "success": False}
    
    def dispatch_emergency(self, incident_data):
        """Dispatch emergency response"""
        try:
            response = requests.post(
                f"{self.base_url}/api/emergency-incident",
                json=incident_data,
                timeout=15
            )
            return response.json()
        except Exception as e:
            return {"error": str(e), "success": False}
    
    def detect_anomalies(self, detection_data):
        """Detect anomalies"""
        try:
            response = requests.post(
                f"{self.base_url}/api/detect-anomalies",
                json=detection_data,
                timeout=15
            )
            return response.json()
        except Exception as e:
            return {"error": str(e), "success": False}
    
    def search_missing_person(self, search_data):
        """Search for missing person"""
        try:
            response = requests.post(
                f"{self.base_url}/api/missing-person",
                json=search_data,
                timeout=20
            )
            return response.json()
        except Exception as e:
            return {"error": str(e), "success": False}

# Initialize API client
api = DrishtiAPI(API_BASE_URL)

def main():
    """Main application"""
    
    # Header
    st.markdown("""
    <div class="main-header">
        <h1>🎯 Project Drishti - AI Situational Awareness Platform</h1>
        <p>Enhanced AI-Powered Security & Emergency Response System</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Sidebar
    with st.sidebar:
        st.title("🎛️ Control Panel")
        
        # System status
        st.subheader("System Status")
        health_status = api.health_check()
        
        if "error" not in health_status:
            if health_status.get("status") == "healthy":
                st.success("✅ System Healthy")
            else:
                st.warning("⚠️ Configuration Needed")
            
            # Show configuration status
            config = health_status.get("configuration", {})
            for service, status in config.items():
                if status:
                    st.success(f"✅ {service}")
                else:
                    st.error(f"❌ {service}")
        else:
            st.error("❌ Backend Offline")
            st.error(f"Error: {health_status['error']}")
            st.info("💡 Make sure the Node.js server is running on localhost:3001")
        
        st.divider()
        
        # Auto-refresh toggle
        auto_refresh = st.checkbox("🔄 Auto Refresh (30s)", value=False)
        if auto_refresh:
            time.sleep(30)
            st.rerun()
        
        # Manual refresh button
        if st.button("🔄 Refresh Now"):
            st.rerun()
        
        st.divider()
        
        # Quick actions
        st.subheader("⚡ Quick Actions")
        if st.button("🚨 Emergency Alert", type="primary"):
            st.error("🚨 Emergency alert activated!")
        
        if st.button("📊 Export Data"):
            st.success("📊 Data export initiated")
        
        if st.button("🔧 System Diagnostics"):
            st.info("🔧 Running diagnostics...")
    
    # Main content tabs
    tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
        "📊 Dashboard", 
        "🔮 Crowd Analysis", 
        "🧠 AI Summary", 
        "🚨 Emergency Dispatch", 
        "👁️ Anomaly Detection", 
        "🔍 Missing Person"
    ])
    
    with tab1:
        show_dashboard()
    
    with tab2:
        show_crowd_analysis()
    
    with tab3:
        show_ai_summary()
    
    with tab4:
        show_emergency_dispatch()
    
    with tab5:
        show_anomaly_detection()
    
    with tab6:
        show_missing_person()

def show_dashboard():
    """Display main dashboard"""
    st.header("📊 Real-Time Dashboard")
    
    # Get dashboard data
    dashboard_data = api.get_dashboard_data()
    
    if dashboard_data.get("success"):
        # Key metrics
        col1, col2, col3, col4 = st.columns(4)
        
        summary = dashboard_data.get("summary", {})
        metrics = dashboard_data.get("metrics", {})
        
        with col1:
            st.metric(
                "Active Cameras",
                summary.get("activeCameras", summary.get("totalCameras", 0)),
                delta=None
            )
        
        with col2:
            density = summary.get("avgCrowdDensity", 0)
            st.metric(
                "Avg Crowd Density",
                f"{int(density * 100)}%",
                delta=None
            )
        
        with col3:
            st.metric(
                "Active Emergencies",
                summary.get("activeEmergencies", 0),
                delta=None
            )
        
        with col4:
            response_time = metrics.get("operations", {}).get("emergencyResponseTime", 5)
            st.metric(
                "Response Time",
                f"{response_time} min",
                delta=None
            )
        
        st.divider()
        
        # Charts and visualizations
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("🗺️ Situational Map")
            show_interactive_map()
        
        with col2:
            st.subheader("🚨 Live Alerts")
            show_live_alerts(dashboard_data.get("alerts", []))
        
        # System metrics
        st.subheader("📈 System Metrics")
        show_system_metrics(metrics)
        
        # Recent activity
        st.subheader("🕒 Recent Activity")
        recent_activity = dashboard_data.get("recentActivity", {})
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            last_analysis = recent_activity.get("lastAnalysis")
            if last_analysis:
                st.info(f"🔍 Last Analysis: {last_analysis}")
            else:
                st.info("🔍 No recent analysis")
        
        with col2:
            last_emergency = recent_activity.get("lastEmergency")
            if last_emergency:
                st.warning(f"🚨 Last Emergency: {last_emergency}")
            else:
                st.success("🚨 No recent emergencies")
        
        with col3:
            last_alert = recent_activity.get("lastAlert")
            if last_alert:
                st.error(f"⚠️ Last Alert: {last_alert}")
            else:
                st.success("⚠️ No recent alerts")
        
    else:
        st.error("❌ Failed to load dashboard data")
        if "error" in dashboard_data:
            st.error(f"Error: {dashboard_data['error']}")
        
        # Show offline mode
        st.info("📱 Running in offline mode with sample data")
        show_offline_dashboard()

def show_offline_dashboard():
    """Show sample dashboard when backend is offline"""
    
    # Sample metrics
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Active Cameras", 12, delta=None)
    with col2:
        st.metric("Avg Crowd Density", "45%", delta=None)
    with col3:
        st.metric("Active Emergencies", 2, delta=None)
    with col4:
        st.metric("Response Time", "6 min", delta=None)
    
    st.divider()
    
    # Sample chart
    sample_data = pd.DataFrame({
        'Time': pd.date_range(start='2024-01-01', periods=24, freq='H'),
        'Crowd Density': [0.3, 0.2, 0.1, 0.1, 0.2, 0.4, 0.6, 0.8, 0.7, 0.6, 0.5, 0.6, 
                         0.7, 0.8, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.2, 0.3]
    })
    
    fig = px.line(sample_data, x='Time', y='Crowd Density', 
                 title='Sample Crowd Density Over Time')
    st.plotly_chart(fig, use_container_width=True)
    
    st.info("💡 This is sample data. Start the backend server to see live data.")

if __name__ == "__main__":
    main()
