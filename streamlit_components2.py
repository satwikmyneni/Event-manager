"""
Additional Streamlit Components for Project Drishti
Anomaly Detection and Missing Person Search
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import json

def show_anomaly_detection():
    """Anomaly detection interface"""
    
    st.header("👁️ Multimodal Anomaly Detection")
    st.write("Advanced AI-powered threat detection across multiple data sources")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # Camera selection
        camera_options = {
            "CAM-001": "Main Entrance",
            "CAM-002": "Food Court", 
            "CAM-003": "Parking Area A",
            "CAM-004": "West Wing",
            "CAM-005": "Emergency Exit"
        }
        
        selected_camera = st.selectbox("Select Camera for Analysis", 
                                     options=list(camera_options.keys()), 
                                     format_func=lambda x: f"{x} - {camera_options[x]}")
        
        analysis_type = st.selectbox("Analysis Type", 
                                   ["multimodal", "video_only", "audio_only", "sensor_fusion"])
        
        # Detection sensitivity
        sensitivity = st.slider("Detection Sensitivity", 0.1, 1.0, 0.7, 0.1)
        
        if st.button("🔍 Run Anomaly Detection", type="primary"):
            with st.spinner("Analyzing for anomalies..."):
                
                detection_data = {
                    "videoFrame": {"mockData": True},
                    "cameraMetadata": {
                        "cameraId": selected_camera,
                        "location": camera_options[selected_camera],
                        "frameWidth": 1920,
                        "frameHeight": 1080
                    },
                    "analysisType": analysis_type
                }
                
                from streamlit_app import api
                result = api.detect_anomalies(detection_data)
                
                if result.get("success"):
                    st.success("✅ Anomaly Detection Complete")
                    
                    detection = result.get("detection", {})
                    anomalies = result.get("anomalies", [])
                    summary = result.get("summary", {})
                    
                    # Detection summary
                    col1, col2, col3, col4 = st.columns(4)
                    
                    with col1:
                        st.metric("Anomalies Found", detection.get("anomaliesDetected", 0))
                    with col2:
                        st.metric("Critical Threats", detection.get("criticalThreats", 0))
                    with col3:
                        st.metric("Overall Threat", summary.get("overallThreatLevel", "NONE"))
                    with col4:
                        st.metric("Confidence", f"{summary.get('averageConfidence', 0)}%")
                    
                    # Anomaly details
                    if anomalies:
                        st.subheader("🚨 Detected Anomalies")
                        
                        for i, anomaly in enumerate(anomalies):
                            with st.expander(f"Anomaly {i+1}: {anomaly.get('type', 'Unknown')}"):
                                
                                threat_level = anomaly.get('threatLevel', 'LOW')
                                confidence = anomaly.get('confidence', 0)
                                
                                col1, col2, col3 = st.columns(3)
                                with col1:
                                    if threat_level == 'CRITICAL':
                                        st.error(f"🔴 {threat_level}")
                                    elif threat_level == 'HIGH':
                                        st.warning(f"🟡 {threat_level}")
                                    else:
                                        st.info(f"🔵 {threat_level}")
                                
                                with col2:
                                    st.metric("Confidence", f"{int(confidence * 100)}%")
                                
                                with col3:
                                    severity = anomaly.get('severity', 0)
                                    st.metric("Severity", f"{severity:.2f}")
                                
                                st.write(f"**Description:** {anomaly.get('description', 'No description')}")
                                st.write(f"**Location:** {anomaly.get('location', 'Unknown')}")
                                st.write(f"**Timestamp:** {anomaly.get('timestamp', 'Unknown')}")
                                
                                # Recommended actions
                                actions = anomaly.get('recommendedActions', [])
                                if actions:
                                    st.write("**Recommended Actions:**")
                                    for action in actions:
                                        st.write(f"• {action}")
                    
                    # Next actions
                    next_actions = result.get("nextActions", [])
                    if next_actions:
                        st.subheader("🎯 Next Steps")
                        for action in next_actions:
                            st.info(f"• {action}")
                    
                    # Alert recommendation
                    if summary.get("recommendsAlert", False):
                        st.error("🚨 **ALERT RECOMMENDED** - Immediate attention required")
                
                else:
                    st.error("❌ Anomaly detection failed")
                    if "error" in result:
                        st.error(f"Error: {result['error']}")
    
    with col2:
        st.subheader("📊 Detection Statistics")
        
        # Mock historical detection data
        detection_history = pd.DataFrame({
            'Hour': range(24),
            'Anomalies': [2, 1, 0, 1, 0, 0, 1, 3, 5, 4, 6, 8, 7, 9, 8, 6, 7, 5, 4, 3, 2, 1, 1, 0],
            'Critical': [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 2, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]
        })
        
        fig = px.line(detection_history, x='Hour', y=['Anomalies', 'Critical'],
                     title='24-Hour Anomaly Detection Trends')
        st.plotly_chart(fig, use_container_width=True)
        
        # Anomaly types distribution
        anomaly_types = pd.DataFrame({
            'Type': ['Crowd Surge', 'Suspicious Behavior', 'Fire/Smoke', 'Weapon Detection', 'Unauthorized Access'],
            'Count': [15, 8, 3, 2, 5]
        })
        
        fig2 = px.pie(anomaly_types, values='Count', names='Type',
                     title='Anomaly Types Distribution')
        st.plotly_chart(fig2, use_container_width=True)

def show_missing_person():
    """Missing person search interface"""
    
    st.header("🔍 AI-Powered Missing Person Search")
    st.write("Advanced facial recognition and behavioral analysis across camera network")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # Person details
        st.subheader("👤 Person Details")
        
        description = st.text_area(
            "Physical Description",
            placeholder="e.g., Adult male, approximately 30 years old, wearing red shirt and blue jeans, brown hair",
            height=100
        )
        
        col_a, col_b = st.columns(2)
        
        with col_a:
            last_location = st.text_input("Last Known Location", 
                                        placeholder="e.g., Near main entrance")
            
            urgency_level = st.selectbox("Urgency Level", 
                                       ["low", "medium", "high", "critical"])
        
        with col_b:
            contact_name = st.text_input("Contact Person", 
                                       placeholder="Name of person reporting")
            
            contact_phone = st.text_input("Contact Phone", 
                                        placeholder="+1234567890")
        
        # Photo upload (optional)
        st.subheader("📷 Photo Upload (Optional)")
        uploaded_file = st.file_uploader("Upload photo of missing person", 
                                       type=['jpg', 'jpeg', 'png'])
        
        if uploaded_file is not None:
            st.image(uploaded_file, caption="Uploaded Photo", width=200)
        
        # Additional details
        with st.expander("Additional Details"):
            age_range = st.selectbox("Age Range", 
                                   ["Child (0-12)", "Teen (13-17)", "Adult (18-65)", "Senior (65+)"])
            
            clothing_details = st.text_input("Clothing Details", 
                                           placeholder="Detailed clothing description")
            
            distinguishing_features = st.text_input("Distinguishing Features", 
                                                  placeholder="Scars, tattoos, accessories, etc.")
            
            medical_conditions = st.text_input("Medical Conditions (if relevant)", 
                                             placeholder="Any medical conditions that might affect behavior")
        
        if st.button("🔍 Initiate Missing Person Search", type="primary"):
            if not description.strip():
                st.error("Please provide a physical description")
                return
            
            with st.spinner("Searching across camera network..."):
                
                search_data = {
                    "description": description,
                    "lastKnownLocation": last_location,
                    "urgencyLevel": urgency_level,
                    "contactInfo": {
                        "name": contact_name,
                        "phone": contact_phone
                    },
                    "photoData": uploaded_file is not None,
                    "additionalDetails": {
                        "ageRange": age_range,
                        "clothingDetails": clothing_details,
                        "distinguishingFeatures": distinguishing_features,
                        "medicalConditions": medical_conditions
                    }
                }
                
                from streamlit_app import api
                result = api.search_missing_person(search_data)
                
                if result.get("success"):
                    st.success("✅ Search Initiated Successfully")
                    
                    search_info = result.get("search", {})
                    results = result.get("results", {})
                    matches = result.get("matches", [])
                    search_status = result.get("searchStatus", {})
                    
                    # Search summary
                    st.subheader("📋 Search Summary")
                    col1, col2, col3, col4 = st.columns(4)
                    
                    with col1:
                        st.metric("Person ID", search_info.get("personId", "Unknown"))
                    with col2:
                        st.metric("Potential Matches", results.get("potentialMatches", 0))
                    with col3:
                        st.metric("High Confidence", results.get("highConfidenceMatches", 0))
                    with col4:
                        st.metric("Cameras Searched", results.get("camerasSearched", 0))
                    
                    # Search status
                    st.subheader("📊 Search Status")
                    status = search_status.get("status", "unknown")
                    
                    if status == "active":
                        st.success(f"🟢 Search Status: {status.upper()}")
                    else:
                        st.info(f"🔵 Search Status: {status.upper()}")
                    
                    st.write(f"**Estimated Completion:** {search_status.get('estimatedCompletion', 'Unknown')}")
                    st.write(f"**Search Coverage:** {results.get('searchCoverage', 'Unknown')}")
                    
                    # Matches found
                    if matches:
                        st.subheader("🎯 Potential Matches Found")
                        
                        for i, match in enumerate(matches):
                            with st.expander(f"Match {i+1} - {match.get('location', 'Unknown Location')}"):
                                
                                col1, col2, col3 = st.columns(3)
                                
                                with col1:
                                    confidence = match.get('confidence', 0)
                                    if confidence >= 80:
                                        st.success(f"🟢 Confidence: {confidence}%")
                                    elif confidence >= 60:
                                        st.warning(f"🟡 Confidence: {confidence}%")
                                    else:
                                        st.info(f"🔵 Confidence: {confidence}%")
                                
                                with col2:
                                    st.write(f"**Camera:** {match.get('cameraId', 'Unknown')}")
                                
                                with col3:
                                    st.write(f"**Time:** {match.get('timestamp', 'Unknown')}")
                                
                                st.write(f"**Location:** {match.get('location', 'Unknown')}")
                                st.write(f"**Description:** {match.get('description', 'No description')}")
                                
                                if match.get('requiresVerification', True):
                                    st.warning("⚠️ Manual verification required")
                                
                                if match.get('imageAvailable', False):
                                    st.info("📷 Camera image available for review")
                    
                    else:
                        st.info("No matches found in initial search")
                    
                    # Next steps
                    next_steps = result.get("nextSteps", [])
                    if next_steps:
                        st.subheader("🎯 Next Steps")
                        for step in next_steps:
                            st.info(f"• {step}")
                    
                    # Alerts and notifications
                    if search_status.get("alertsActivated", False):
                        st.success("✅ Security alerts have been activated")
                    
                    if search_status.get("publicAlertRecommended", False):
                        st.warning("⚠️ Public alert system activation recommended")
                
                else:
                    st.error("❌ Search initiation failed")
                    if "error" in result:
                        st.error(f"Error: {result['error']}")
    
    with col2:
        st.subheader("📊 Search Statistics")
        
        # Mock search statistics
        search_stats = pd.DataFrame({
            'Status': ['Found', 'Ongoing', 'Closed'],
            'Count': [45, 12, 8]
        })
        
        fig = px.pie(search_stats, values='Count', names='Status',
                    title='Missing Person Cases - Last 30 Days')
        st.plotly_chart(fig, use_container_width=True)
        
        # Success rate by urgency
        success_data = pd.DataFrame({
            'Urgency Level': ['Critical', 'High', 'Medium', 'Low'],
            'Success Rate %': [95, 87, 78, 65]
        })
        
        fig2 = px.bar(success_data, x='Urgency Level', y='Success Rate %',
                     title='Search Success Rate by Urgency Level')
        st.plotly_chart(fig2, use_container_width=True)
        
        # Recent searches
        st.subheader("🕒 Recent Searches")
        recent_searches = pd.DataFrame({
            'Time': ['2 hours ago', '5 hours ago', '1 day ago'],
            'Status': ['Found', 'Ongoing', 'Found'],
            'Location': ['Food Court', 'Parking A', 'Main Gate']
        })
        
        st.dataframe(recent_searches, use_container_width=True)

# Import these functions into the main streamlit_app.py
def integrate_components():
    """Function to integrate all components"""
    from streamlit_components import (
        show_interactive_map, show_live_alerts, show_system_metrics,
        show_crowd_analysis, show_ai_summary, show_emergency_dispatch
    )
    
    return {
        'show_interactive_map': show_interactive_map,
        'show_live_alerts': show_live_alerts,
        'show_system_metrics': show_system_metrics,
        'show_crowd_analysis': show_crowd_analysis,
        'show_ai_summary': show_ai_summary,
        'show_emergency_dispatch': show_emergency_dispatch,
        'show_anomaly_detection': show_anomaly_detection,
        'show_missing_person': show_missing_person
    }
