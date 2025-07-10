"""
Streamlit Components for Project Drishti
Supporting functions and UI components
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import folium
from streamlit_folium import st_folium
import json

def show_interactive_map():
    """Display interactive map with camera and incident markers"""
    
    # Create base map centered on San Francisco
    m = folium.Map(
        location=[37.7749, -122.4194],
        zoom_start=13,
        tiles='OpenStreetMap'
    )
    
    # Camera locations
    cameras = [
        {"id": "CAM-001", "lat": 37.7749, "lng": -122.4194, "name": "Main Entrance", "status": "active"},
        {"id": "CAM-002", "lat": 37.7849, "lng": -122.4094, "name": "Food Court", "status": "active"},
        {"id": "CAM-003", "lat": 37.7649, "lng": -122.4294, "name": "Parking Area A", "status": "active"},
        {"id": "CAM-004", "lat": 37.7549, "lng": -122.4394, "name": "West Wing", "status": "maintenance"},
        {"id": "CAM-005", "lat": 37.7449, "lng": -122.4494, "name": "Emergency Exit", "status": "active"}
    ]
    
    # Add camera markers
    for camera in cameras:
        color = 'green' if camera['status'] == 'active' else 'orange'
        folium.Marker(
            [camera['lat'], camera['lng']],
            popup=f"""
            <b>{camera['name']}</b><br>
            ID: {camera['id']}<br>
            Status: {camera['status'].upper()}
            """,
            tooltip=camera['name'],
            icon=folium.Icon(color=color, icon='video-camera', prefix='fa')
        ).add_to(m)
    
    # Incident locations
    incidents = [
        {"id": "INC-001", "lat": 37.7699, "lng": -122.4144, "type": "MEDICAL", "priority": "HIGH"},
        {"id": "INC-002", "lat": 37.7799, "lng": -122.4044, "type": "FIRE", "priority": "CRITICAL"},
        {"id": "INC-003", "lat": 37.7599, "lng": -122.4244, "type": "SECURITY", "priority": "MEDIUM"}
    ]
    
    # Add incident markers
    for incident in incidents:
        color = 'red' if incident['priority'] == 'CRITICAL' else 'orange' if incident['priority'] == 'HIGH' else 'blue'
        folium.Marker(
            [incident['lat'], incident['lng']],
            popup=f"""
            <b>{incident['type']} Incident</b><br>
            ID: {incident['id']}<br>
            Priority: {incident['priority']}
            """,
            tooltip=f"{incident['type']} - {incident['priority']}",
            icon=folium.Icon(color=color, icon='exclamation-triangle', prefix='fa')
        ).add_to(m)
    
    # Display map
    map_data = st_folium(m, width=700, height=400)
    
    return map_data

def show_live_alerts(alerts):
    """Display live alerts"""
    
    if not alerts:
        st.success("✅ No active alerts")
        return
    
    for alert in alerts:
        priority = alert.get('priority', 'LOW')
        message = alert.get('message', 'No message')
        timestamp = alert.get('timestamp', datetime.now().isoformat())
        acknowledged = alert.get('acknowledged', False)
        
        # Format timestamp
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            time_str = dt.strftime('%H:%M:%S')
        except:
            time_str = "Unknown"
        
        # Alert styling based on priority
        if priority == 'HIGH':
            alert_class = "alert-high"
        elif priority == 'MEDIUM':
            alert_class = "alert-medium"
        else:
            alert_class = "alert-low"
        
        # Display alert
        st.markdown(f"""
        <div class="{alert_class}">
            <strong>{priority} PRIORITY</strong><br>
            {message}<br>
            <small>{time_str} {'✅ Acknowledged' if acknowledged else '⚠️ Pending'}</small>
        </div>
        """, unsafe_allow_html=True)

def show_system_metrics(metrics):
    """Display system performance metrics"""
    
    if not metrics:
        st.info("No metrics data available")
        return
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.subheader("👥 Crowd Analysis")
        crowd_metrics = metrics.get('crowdAnalysis', {})
        
        st.metric("People Detected", crowd_metrics.get('totalPeopleDetected', 0))
        st.metric("Average Density", f"{crowd_metrics.get('averageDensity', 0)}%")
        st.metric("Flow Rate", crowd_metrics.get('flowRate', 'NORMAL'))
    
    with col2:
        st.subheader("🔒 Security")
        security_metrics = metrics.get('security', {})
        
        st.metric("Anomalies Detected", security_metrics.get('anomaliesDetected', 0))
        st.metric("Threat Level", security_metrics.get('threatLevel', 'LOW'))
        st.metric("Response Time", f"{security_metrics.get('responseTime', 0)} min")
    
    with col3:
        st.subheader("🚨 Operations")
        ops_metrics = metrics.get('operations', {})
        
        st.metric("Active Incidents", ops_metrics.get('activeIncidents', 0))
        st.metric("Units Available", ops_metrics.get('unitsAvailable', 0))
        st.metric("System Uptime", ops_metrics.get('systemUptime', '99.9%'))

def show_crowd_analysis():
    """Crowd dynamics analysis interface"""
    
    st.header("🔮 Predictive Crowd Analysis")
    st.write("AI-powered crowd dynamics analysis with 15-20 minute predictions")
    
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
        
        selected_camera = st.selectbox("Select Camera", options=list(camera_options.keys()), 
                                     format_func=lambda x: f"{x} - {camera_options[x]}")
        
        coverage_area = st.slider("Coverage Area (sq meters)", 500, 2000, 1000)
        
        if st.button("🔍 Analyze Crowd Dynamics", type="primary"):
            with st.spinner("Analyzing crowd dynamics..."):
                
                camera_data = {
                    "videoFeed": {"mockData": True},
                    "cameraMetadata": {
                        "cameraId": selected_camera,
                        "location": camera_options[selected_camera],
                        "frameWidth": 1920,
                        "frameHeight": 1080,
                        "coverageAreaSqMeters": coverage_area
                    }
                }
                
                from streamlit_app import api
                result = api.analyze_crowd_dynamics(camera_data)
                
                if result.get("success"):
                    st.success("✅ Analysis Complete")
                    
                    # Display results
                    analysis = result.get("analysis", {})
                    current_metrics = analysis.get("currentMetrics", {})
                    predictions = analysis.get("predictions", {})
                    
                    # Metrics display
                    col1, col2, col3, col4 = st.columns(4)
                    
                    with col1:
                        st.metric("People Count", current_metrics.get("peopleCount", 0))
                    with col2:
                        density = current_metrics.get("density", 0)
                        st.metric("Density", f"{int(density * 100)}%")
                    with col3:
                        st.metric("Alert Level", analysis.get("alertLevel", "LOW"))
                    with col4:
                        confidence = predictions.get("confidence", 0)
                        st.metric("Confidence", f"{int(confidence * 100)}%")
                    
                    # Predictions
                    st.subheader("🔮 Predictions")
                    bottleneck_time = predictions.get("timeToBottleneck")
                    if bottleneck_time:
                        st.warning(f"⚠️ Bottleneck predicted in {bottleneck_time} minutes")
                    else:
                        st.success("✅ No immediate bottleneck risk detected")
                    
                    # Proactive actions
                    proactive_actions = analysis.get("proactiveActions", {})
                    actions = proactive_actions.get("actions", [])
                    
                    if actions:
                        st.subheader("🎯 Recommended Actions")
                        for action in actions:
                            priority = action.get("priority", "LOW")
                            action_text = action.get("action", "No action specified")
                            
                            if priority == "CRITICAL":
                                st.error(f"🚨 {priority}: {action_text}")
                            elif priority == "HIGH":
                                st.warning(f"⚠️ {priority}: {action_text}")
                            else:
                                st.info(f"ℹ️ {priority}: {action_text}")
                    
                else:
                    st.error("❌ Analysis failed")
                    if "error" in result:
                        st.error(f"Error: {result['error']}")
    
    with col2:
        st.subheader("📊 Historical Data")
        
        # Generate sample historical data
        import numpy as np
        dates = pd.date_range(start=datetime.now() - timedelta(hours=24), 
                            end=datetime.now(), freq='H')
        
        crowd_data = pd.DataFrame({
            'Time': dates,
            'People Count': np.random.randint(50, 500, len(dates)),
            'Density': np.random.uniform(0.2, 0.9, len(dates))
        })
        
        # Plot crowd trends
        fig = px.line(crowd_data, x='Time', y='People Count', 
                     title='24-Hour Crowd Trends')
        st.plotly_chart(fig, use_container_width=True)
        
        # Density heatmap
        fig2 = px.line(crowd_data, x='Time', y='Density',
                      title='Crowd Density Over Time')
        st.plotly_chart(fig2, use_container_width=True)

def show_ai_summary():
    """AI situational summary interface"""
    
    st.header("🧠 AI Situational Intelligence")
    st.write("Generate comprehensive situational summaries using advanced AI")
    
    # Query input
    query = st.text_area(
        "Enter your situational query:",
        placeholder="Example: Summarize security concerns in West Zone for the last hour",
        height=100
    )
    
    col1, col2 = st.columns(2)
    
    with col1:
        zone = st.selectbox("Zone", ["West Zone", "East Zone", "North Zone", "South Zone", "Central Area"])
        
    with col2:
        time_window = st.selectbox("Time Window", 
                                 ["last 15 minutes", "last 30 minutes", "last hour", "last 2 hours"])
    
    special_events = st.text_input("Special Events (optional)", 
                                 placeholder="e.g., Concert, Sports event, Conference")
    
    if st.button("🧠 Generate AI Summary", type="primary"):
        if not query.strip():
            st.error("Please enter a query")
            return
        
        with st.spinner("Generating AI situational summary..."):
            
            query_data = {
                "query": query,
                "zone": zone,
                "timeWindow": time_window,
                "specialEvents": special_events if special_events else None
            }
            
            from streamlit_app import api
            result = api.generate_situational_summary(query_data)
            
            if result.get("success"):
                st.success("✅ Summary Generated")
                
                briefing = result.get("briefing", {})
                intelligence = result.get("intelligence", {})
                action_items = result.get("actionItems", {})
                
                # Executive Summary
                st.subheader("📋 Executive Summary")
                st.write(briefing.get("executiveSummary", "No summary available"))
                
                # Threat Assessment
                st.subheader("🔍 Threat Assessment")
                threat_assessment = briefing.get("threatAssessment", {})
                
                col1, col2, col3 = st.columns(3)
                with col1:
                    threat_level = threat_assessment.get("level", "UNKNOWN")
                    if threat_level == "RED":
                        st.error(f"🔴 Threat Level: {threat_level}")
                    elif threat_level == "YELLOW":
                        st.warning(f"🟡 Threat Level: {threat_level}")
                    else:
                        st.success(f"🟢 Threat Level: {threat_level}")
                
                with col2:
                    st.metric("Confidence", f"{intelligence.get('confidence', 0)}%")
                
                with col3:
                    sentiment = intelligence.get('sentiment', 'NEUTRAL')
                    st.metric("Crowd Sentiment", sentiment)
                
                # Immediate threats
                immediate_threats = threat_assessment.get("immediateThreats", [])
                if immediate_threats:
                    st.subheader("⚠️ Immediate Threats")
                    for threat in immediate_threats:
                        st.warning(f"• {threat}")
                
                # Action Items
                st.subheader("🎯 Recommended Actions")
                
                immediate_actions = action_items.get("immediate", [])
                planned_actions = action_items.get("planned", [])
                monitoring_actions = action_items.get("monitoring", [])
                
                if immediate_actions:
                    st.write("**Immediate Actions:**")
                    for action in immediate_actions:
                        st.error(f"🚨 {action.get('action', 'No action specified')}")
                
                if planned_actions:
                    st.write("**Planned Actions:**")
                    for action in planned_actions:
                        st.warning(f"⚠️ {action.get('action', 'No action specified')}")
                
                if monitoring_actions:
                    st.write("**Monitoring Actions:**")
                    for action in monitoring_actions:
                        st.info(f"ℹ️ {action.get('action', 'No action specified')}")
                
                # Data sources
                st.subheader("📊 Data Sources")
                data_sources = result.get("dataSourcesUsed", [])
                st.write(", ".join(data_sources))
                
            else:
                st.error("❌ Failed to generate summary")
                if "error" in result:
                    st.error(f"Error: {result['error']}")

def show_emergency_dispatch():
    """Emergency dispatch interface"""
    
    st.header("🚨 Intelligent Emergency Dispatch")
    st.write("Smart resource allocation with optimized routing")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # Incident details
        incident_type = st.selectbox("Emergency Type", 
                                   ["MEDICAL", "FIRE", "SECURITY", "CROWD_CONTROL", "EVACUATION"])
        
        location = st.text_input("Location", placeholder="e.g., Food Court Section B")
        
        description = st.text_area("Description", 
                                 placeholder="Describe the emergency situation...",
                                 height=100)
        
        priority = st.selectbox("Priority Level", ["low", "medium", "high", "critical"])
        
        # Coordinates (optional)
        st.subheader("📍 Location Coordinates (Optional)")
        col_lat, col_lng = st.columns(2)
        with col_lat:
            latitude = st.number_input("Latitude", value=37.7749, format="%.6f")
        with col_lng:
            longitude = st.number_input("Longitude", value=-122.4194, format="%.6f")
        
        if st.button("🚨 Dispatch Emergency Response", type="primary"):
            if not location.strip():
                st.error("Please enter a location")
                return
            
            with st.spinner("Dispatching emergency units..."):
                
                incident_data = {
                    "type": incident_type,
                    "location": location,
                    "description": description,
                    "priority": priority,
                    "coordinates": {"lat": latitude, "lng": longitude}
                }
                
                from streamlit_app import api
                result = api.dispatch_emergency(incident_data)
                
                if result.get("success"):
                    st.success("✅ Emergency Response Dispatched")
                    
                    incident = result.get("incident", {})
                    dispatch = result.get("dispatch", {})
                    units = result.get("units", [])
                    protocol = result.get("protocol", {})
                    
                    # Incident summary
                    st.subheader("📋 Incident Summary")
                    col1, col2, col3 = st.columns(3)
                    
                    with col1:
                        st.metric("Incident ID", incident.get("id", "Unknown"))
                    with col2:
                        st.metric("Units Dispatched", dispatch.get("unitsDispatched", 0))
                    with col3:
                        st.metric("ETA", f"{dispatch.get('fastestETA', 0)} min")
                    
                    # Protocol information
                    st.subheader("📋 Response Protocol")
                    st.write(f"**Priority:** {protocol.get('priority', 'UNKNOWN')}")
                    st.write(f"**Target Response Time:** {protocol.get('responseTime', 'Unknown')}")
                    
                    # Equipment
                    equipment = protocol.get("equipment", [])
                    if equipment:
                        st.write("**Required Equipment:**")
                        for item in equipment:
                            st.write(f"• {item}")
                    
                    # Procedures
                    procedures = protocol.get("procedures", [])
                    if procedures:
                        st.write("**Response Procedures:**")
                        for i, procedure in enumerate(procedures, 1):
                            st.write(f"{i}. {procedure}")
                    
                    # Unit details
                    if units:
                        st.subheader("🚗 Dispatched Units")
                        for unit in units:
                            with st.expander(f"Unit {unit.get('unitId', 'Unknown')}"):
                                st.write(f"**Type:** {unit.get('type', 'Unknown')}")
                                st.write(f"**ETA:** {unit.get('eta', 'Unknown')}")
                                st.write(f"**Status:** {unit.get('status', 'Unknown')}")
                                
                                route = unit.get('route', {})
                                if route:
                                    st.write(f"**Distance:** {route.get('distance', 'Unknown')}")
                                    st.write(f"**Estimated Time:** {route.get('estimatedTime', 'Unknown')}")
                
                else:
                    st.error("❌ Dispatch failed")
                    if "error" in result:
                        st.error(f"Error: {result['error']}")
    
    with col2:
        st.subheader("🚗 Available Units")
        
        # Mock available units data
        units_data = [
            {"ID": "SEC-001", "Type": "Security", "Status": "Available", "Location": "Zone A"},
            {"ID": "SEC-002", "Type": "Security", "Status": "Busy", "Location": "Zone B"},
            {"ID": "MED-001", "Type": "Medical", "Status": "Available", "Location": "Zone C"},
            {"ID": "FIRE-001", "Type": "Fire", "Status": "Available", "Location": "Zone D"},
        ]
        
        df = pd.DataFrame(units_data)
        st.dataframe(df, use_container_width=True)
        
        # Response time chart
        st.subheader("📊 Response Times")
        response_data = pd.DataFrame({
            'Unit Type': ['Security', 'Medical', 'Fire'],
            'Avg Response Time (min)': [5, 7, 4]
        })
        
        fig = px.bar(response_data, x='Unit Type', y='Avg Response Time (min)',
                    title='Average Response Times by Unit Type')
        st.plotly_chart(fig, use_container_width=True)
