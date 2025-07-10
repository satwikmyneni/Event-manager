# Project Drishti Demo Scenarios

## Overview
This document provides comprehensive demo scenarios to showcase Project Drishti's AI-powered situational awareness capabilities.

## Demo Setup

### Prerequisites
- Deployed Project Drishti system
- Sample video feeds or camera simulators
- Test emergency units configured
- Demo social media data

### Mock Data Generation
Use the following script to generate realistic demo data:

```javascript
// Generate mock camera feed data
const generateMockCameraData = () => {
  return {
    cameraId: 'CAM-DEMO-001',
    location: 'Main Stage Area',
    coordinates: { lat: 37.7749, lng: -122.4194 },
    timestamp: new Date(),
    imageBuffer: generateMockImageBuffer(),
    metadata: {
      resolution: '1920x1080',
      fps: 30,
      coverageArea: 1000
    }
  };
};
```

## Scenario 1: Predictive Crowd Management

### Setup
- **Location**: Music festival main stage
- **Time**: 30 minutes before headliner performance
- **Initial Conditions**: Moderate crowd density (60%)

### Demo Flow

#### Step 1: Normal Monitoring
```bash
# Simulate normal crowd monitoring
curl -X POST https://your-functions-url/processVideoFrame \
  -H "Content-Type: application/json" \
  -d '{
    "imageBuffer": "base64_encoded_crowd_image",
    "cameraMetadata": {
      "cameraId": "CAM-MAIN-STAGE",
      "location": "Main Stage Area",
      "coordinates": {"lat": 37.7749, "lng": -122.4194},
      "coverageArea": 1000
    }
  }'
```

#### Step 2: Density Increase Detection
- System detects increasing crowd density (75% → 85%)
- AI predicts potential overcrowding in 18 minutes
- Dashboard shows yellow warning indicators

#### Step 3: Predictive Alert Generation
```json
{
  "alert": {
    "type": "PREDICTIVE_CROWDING",
    "severity": "WARNING",
    "message": "High risk of overcrowding predicted in 18 minutes",
    "confidence": 0.87,
    "recommendations": [
      "Deploy crowd control barriers",
      "Open alternative viewing areas",
      "Announce crowd dispersal messages"
    ]
  }
}
```

#### Step 4: Proactive Response
- Security teams receive automated notifications
- Suggested crowd diversion routes displayed on map
- Real-time updates as situation evolves

### Expected Outcomes
- 18-minute advance warning achieved
- Proactive crowd management prevents dangerous overcrowding
- Smooth event flow maintained

## Scenario 2: Emergency Response Coordination

### Setup
- **Location**: Food court area
- **Emergency Type**: Medical emergency
- **Available Units**: 2 medical, 3 security, 1 fire crew

### Demo Flow

#### Step 1: Emergency Report
```bash
# Report medical emergency via mobile app
curl -X POST https://your-functions-url/reportEmergency \
  -H "Content-Type: application/json" \
  -d '{
    "type": "MEDICAL",
    "location": "Food Court Section B",
    "coordinates": {"lat": 37.7750, "lng": -122.4190},
    "description": "Person collapsed, appears unconscious",
    "severity": "HIGH",
    "reportedBy": "security_officer_123"
  }'
```

#### Step 2: Automatic Unit Dispatch
- System identifies nearest medical unit (0.3 miles away)
- Calculates optimal route avoiding crowd congestion
- Dispatches medical team with 4-minute ETA

#### Step 3: Coordinated Response
```json
{
  "dispatchResult": {
    "emergencyId": "EMG-1234567890",
    "dispatchedUnits": [
      {
        "unitId": "MEDICAL-001",
        "type": "ambulance",
        "eta": 4,
        "route": "optimized_route_data"
      },
      {
        "unitId": "SECURITY-002", 
        "type": "security",
        "eta": 3,
        "role": "crowd_control"
      }
    ],
    "status": "dispatched"
  }
}
```

#### Step 4: Real-time Tracking
- Live map shows unit locations and routes
- Automatic status updates as units respond
- Supervisor notifications sent

### Expected Outcomes
- Sub-5-minute response time achieved
- Coordinated multi-unit response
- Minimal disruption to event flow

## Scenario 3: AI-Powered Situational Intelligence

### Setup
- **Query**: "Summarize safety issues in West Gate area over last 30 minutes"
- **Available Data**: Camera feeds, sensor data, social media, alerts

### Demo Flow

#### Step 1: Natural Language Query
```bash
# Generate situational summary
curl -X POST https://your-functions-url/generateSituationalSummary \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Summarize safety issues in West Gate area over last 30 minutes",
    "context": {
      "location": "West Gate",
      "timeRange": "last 30 minutes"
    }
  }'
```

#### Step 2: Multi-Source Data Fusion
- Gemini analyzes crowd analytics data
- Processes security alerts and sensor readings
- Incorporates social media sentiment
- Reviews emergency reports

#### Step 3: Intelligent Summary Generation
```json
{
  "summary": {
    "criticalEvents": [
      "Long queue formation causing bottleneck at security checkpoint",
      "3 reports of pickpocketing incidents near entrance"
    ],
    "probableCauses": [
      "Insufficient security lanes for current crowd volume",
      "Opportunistic crime due to crowd density"
    ],
    "currentStatus": "ELEVATED RISK - Crowd congestion with security concerns",
    "suggestedActions": [
      "Open additional security lanes immediately",
      "Deploy plainclothes security officers",
      "Implement crowd flow management"
    ],
    "riskAssessment": "Medium risk of escalation if not addressed within 15 minutes"
  },
  "confidence": 0.91,
  "dataSourcesUsed": ["crowd_analytics", "security_alerts", "social_media"]
}
```

### Expected Outcomes
- Comprehensive situational awareness in seconds
- Actionable intelligence for decision-making
- Multi-source data correlation

## Scenario 4: Anomaly Detection and Threat Response

### Setup
- **Location**: Multiple camera feeds across venue
- **Threat Type**: Suspicious behavior detection
- **Detection Method**: Gemini Vision + traditional CV

### Demo Flow

#### Step 1: Continuous Monitoring
- AI analyzes video feeds in real-time
- Gemini Vision scans for behavioral anomalies
- Traditional CV detects objects and movements

#### Step 2: Anomaly Detection
```json
{
  "detection": {
    "type": "SUSPICIOUS_BEHAVIOR",
    "confidence": 0.84,
    "location": "Section C, Camera 7",
    "description": "Individual exhibiting agitated behavior, repeatedly checking surroundings",
    "evidence": {
      "snapshot": "base64_image_data",
      "timestamp": "2024-01-15T14:30:00Z",
      "boundingBox": {"x": 0.3, "y": 0.4, "width": 0.2, "height": 0.3}
    },
    "recommendedActions": [
      "Dispatch security for visual confirmation",
      "Monitor closely for escalation",
      "Prepare crowd management if needed"
    ]
  }
}
```

#### Step 3: Alert Processing
- High-confidence alert triggers immediate notification
- Security teams receive location and description
- Dashboard highlights affected area on map

#### Step 4: Response Coordination
- Security unit dispatched for investigation
- Continuous monitoring of individual
- Escalation protocols ready if needed

### Expected Outcomes
- Early threat detection before incidents occur
- Coordinated security response
- Minimal false positives due to AI accuracy

## Scenario 5: Lost Person Recovery

### Setup
- **Missing Person**: Child separated from family
- **Last Known Location**: Near carousel
- **Search Method**: AI-powered facial recognition

### Demo Flow

#### Step 1: Missing Person Report
```bash
# Report missing person with photo
curl -X POST https://your-functions-url/reportMissingPerson \
  -H "Content-Type: application/json" \
  -d '{
    "photo": "base64_encoded_photo",
    "description": "8-year-old boy, red t-shirt, blue jeans",
    "lastKnownLocation": "Carousel area",
    "contactInfo": {
      "phone": "+1234567890",
      "name": "Parent Name"
    }
  }'
```

#### Step 2: AI Search Activation
- Gemini Vision extracts facial features
- Search profile created and distributed
- All camera feeds begin scanning

#### Step 3: Potential Match Detection
```json
{
  "match": {
    "personId": "PERSON-1234567890",
    "confidence": 0.78,
    "location": "Food Court Camera 3",
    "timestamp": "2024-01-15T14:45:00Z",
    "description": "Child matching description spotted near food vendors",
    "coordinates": {"lat": 37.7751, "lng": -122.4189}
  }
}
```

#### Step 4: Verification and Recovery
- Security team dispatched to verify match
- Parents notified of potential sighting
- Reunion coordinated safely

### Expected Outcomes
- Rapid person location using AI
- Coordinated search across all cameras
- Safe family reunion

## Scenario 6: Crowd Sentiment Analysis

### Setup
- **Event Phase**: Concert intermission
- **Data Sources**: Video feeds + social media
- **Monitoring**: Real-time sentiment tracking

### Demo Flow

#### Step 1: Multi-Modal Sentiment Analysis
- Gemini Vision analyzes facial expressions
- Social media posts processed for sentiment
- Combined sentiment score calculated

#### Step 2: Sentiment Change Detection
```json
{
  "sentimentAnalysis": {
    "overall": "NEGATIVE",
    "confidence": 0.82,
    "sources": {
      "visual": {
        "sentiment": "TENSE",
        "indicators": ["frustrated expressions", "agitated body language"]
      },
      "social": {
        "sentiment": "NEGATIVE", 
        "themes": ["long bathroom lines", "expensive food", "sound issues"]
      }
    },
    "alert": {
      "type": "SENTIMENT_DECLINE",
      "message": "Crowd sentiment declining due to service issues"
    }
  }
}
```

#### Step 3: Proactive Response
- Event management notified of sentiment issues
- Specific problems identified (bathroom lines, sound)
- Corrective actions implemented

### Expected Outcomes
- Early detection of crowd dissatisfaction
- Specific issue identification
- Proactive problem resolution

## Demo Script for Live Presentation

### 15-Minute Demo Flow

#### Minutes 1-3: System Overview
- Show live dashboard with real-time data
- Explain AI agent architecture
- Demonstrate multi-source data fusion

#### Minutes 4-6: Predictive Analytics
- Simulate crowd density increase
- Show 18-minute prediction capability
- Display recommended actions

#### Minutes 7-9: Emergency Response
- Trigger mock medical emergency
- Show automatic dispatch process
- Track units on live map

#### Minutes 10-12: AI Intelligence
- Ask natural language question
- Show Gemini-powered analysis
- Display actionable insights

#### Minutes 13-15: Anomaly Detection
- Show suspicious behavior detection
- Demonstrate threat assessment
- Explain response coordination

### Interactive Elements
- Live queries to AI system
- Real-time map interactions
- Mobile app demonstration
- Alert notification examples

## Performance Metrics

### Key Performance Indicators
- **Prediction Accuracy**: 85%+ for crowd surge prediction
- **Response Time**: <5 minutes for emergency dispatch
- **False Positive Rate**: <10% for anomaly detection
- **System Uptime**: 99.9% availability
- **Processing Speed**: <2 seconds for video frame analysis

### Success Criteria
- Proactive intervention prevents incidents
- Reduced emergency response times
- Improved situational awareness
- Enhanced public safety outcomes

## Customization for Different Events

### Music Festivals
- Focus on crowd surge prevention
- Emphasize noise level monitoring
- Include substance abuse detection

### Political Rallies
- Enhanced security threat detection
- Crowd sentiment analysis priority
- Protest movement tracking

### Sports Events
- Stadium-specific crowd flow
- Weather impact considerations
- Traffic management integration

### Corporate Events
- VIP protection protocols
- Access control integration
- Business continuity focus

This comprehensive demo framework showcases Project Drishti's full capabilities while providing realistic scenarios that demonstrate the system's value for public safety and event management.
