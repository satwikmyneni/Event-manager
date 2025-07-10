# Project Drishti Deployment Guide

## Prerequisites

### Google Cloud Setup
1. Create a Google Cloud Project
2. Enable the following APIs:
   - Vertex AI API
   - Vision API
   - Maps JavaScript API
   - Distance Matrix API
   - Directions API
   - Geocoding API
3. Create a service account with appropriate permissions
4. Download the service account key JSON file

### Firebase Setup
1. Create a Firebase project (can be the same as GCP project)
2. Enable the following services:
   - Authentication
   - Firestore Database
   - Cloud Functions
   - Hosting
   - Cloud Storage
   - Cloud Messaging
3. Get your Firebase configuration object

### API Keys
1. Get a Gemini API key from Google AI Studio
2. Get Google Maps API key with appropriate restrictions

## Environment Configuration

1. Copy `config/.env.example` to `config/.env`
2. Fill in all required environment variables:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
GOOGLE_CLOUD_REGION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

# Vertex AI Configuration
VERTEX_AI_LOCATION=us-central1
GEMINI_API_KEY=your_gemini_api_key

# Google Maps Configuration
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key
```

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Firebase CLI Setup
```bash
npm install -g firebase-tools
firebase login
firebase use --add your_project_id
```

### 3. Deploy Firebase Functions
```bash
cd backend/functions
npm install
cd ../..
firebase deploy --only functions
```

### 4. Deploy Firestore Rules and Indexes
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 5. Build and Deploy Frontend
```bash
npm run build
firebase deploy --only hosting
```

### 6. Initialize Emergency Units
After deployment, call the initialization function:
```bash
curl -X POST https://your-region-your-project.cloudfunctions.net/initializeUnits \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Configuration

### Camera Integration
To integrate with camera feeds, you'll need to:

1. Set up video streaming endpoints
2. Configure camera metadata in Firestore:
```javascript
{
  cameraId: "CAM-001",
  location: "Main Entrance",
  coordinates: { lat: 37.7749, lng: -122.4194 },
  coverageArea: 500, // square meters
  status: "active"
}
```

### Emergency Units Setup
Configure your emergency response units:
```javascript
{
  id: "SECURITY-001",
  type: "security",
  baseLocation: { lat: 37.7749, lng: -122.4194 },
  status: "available",
  capabilities: ["crowd_control", "general_security"],
  contactInfo: { radio: "CH1", phone: "+1234567890" }
}
```

### Social Media Integration
To enable social media sentiment analysis:

1. Set up Twitter API access
2. Configure Facebook Graph API
3. Add credentials to environment variables
4. Enable social media data collection functions

## Testing

### Local Development
```bash
# Start Firebase emulators
firebase emulators:start

# In another terminal, start the development server
npm run dev
```

### Production Testing
1. Test all API endpoints
2. Verify real-time data flow
3. Test emergency dispatch workflow
4. Validate alert notifications
5. Check mobile responsiveness

## Monitoring and Maintenance

### Firebase Console
- Monitor function execution logs
- Check Firestore usage and performance
- Review authentication activity

### Google Cloud Console
- Monitor Vertex AI API usage
- Check Vision API quotas
- Review Maps API usage

### Performance Optimization
1. Set up Firebase Performance Monitoring
2. Configure Cloud Monitoring alerts
3. Implement error tracking with Sentry or similar
4. Set up uptime monitoring

## Security Considerations

### API Security
- Restrict API keys to specific domains/IPs
- Use Firebase App Check for additional security
- Implement rate limiting on Cloud Functions

### Data Privacy
- Ensure GDPR compliance for EU users
- Implement data retention policies
- Secure handling of biometric data for lost person searches

### Access Control
- Set up proper Firebase Authentication
- Configure role-based access control
- Regular security audits

## Scaling

### High Traffic Events
- Enable Firebase Functions concurrency
- Use Cloud Run for compute-intensive tasks
- Implement caching strategies
- Consider CDN for static assets

### Multi-Region Deployment
- Deploy functions to multiple regions
- Use Firestore multi-region configuration
- Implement load balancing

## Troubleshooting

### Common Issues
1. **API Quota Exceeded**: Check usage in Google Cloud Console
2. **Function Timeout**: Increase timeout limits or optimize code
3. **Firestore Permission Denied**: Review security rules
4. **Real-time Updates Not Working**: Check WebSocket connections

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG_MODE=true
```

### Support
For technical support:
- Check Firebase documentation
- Review Google Cloud AI documentation
- Consult project GitHub issues

## Backup and Recovery

### Data Backup
- Set up automated Firestore backups
- Export critical configuration data
- Backup service account keys securely

### Disaster Recovery
- Document recovery procedures
- Test backup restoration
- Maintain offline documentation

## Cost Optimization

### Monitor Usage
- Set up billing alerts
- Review API usage regularly
- Optimize function execution time
- Use appropriate Firestore pricing tier

### Resource Management
- Clean up old data automatically
- Optimize image processing
- Use efficient query patterns
