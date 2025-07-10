/**
 * Firebase Cloud Functions for Project Drishti
 * Handles real-time processing, alerts, and coordination
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Initialize AI agents
const CrowdAnalyticsAgent = require('../../agent/crowd-analytics');
const SituationalIntelligenceAgent = require('../../agent/situational-intelligence');
const EmergencyDispatchAgent = require('../../agent/emergency-dispatch');
const AnomalyDetectionAgent = require('../../agent/anomaly-detection');
const LostFoundSentimentAgent = require('../../agent/lost-found-sentiment');

// Initialize agents with environment variables
const crowdAgent = new CrowdAnalyticsAgent();
const situationalAgent = new SituationalIntelligenceAgent(process.env.GEMINI_API_KEY);
const dispatchAgent = new EmergencyDispatchAgent(process.env.GOOGLE_MAPS_API_KEY);
const anomalyAgent = new AnomalyDetectionAgent(process.env.GEMINI_API_KEY);
const lostFoundAgent = new LostFoundSentimentAgent(process.env.GEMINI_API_KEY);

/**
 * Process incoming video frame from cameras
 */
exports.processVideoFrame = functions.https.onCall(async (data, context) => {
  try {
    const { imageBuffer, cameraMetadata } = data;
    
    // Convert base64 to buffer
    const buffer = Buffer.from(imageBuffer, 'base64');
    
    // Run all analyses in parallel
    const [crowdAnalysis, anomalyAnalysis, sentimentAnalysis, missingPersonMatches] = await Promise.all([
      crowdAgent.analyzeFrame(buffer, cameraMetadata),
      anomalyAgent.analyzeFrame(buffer, cameraMetadata),
      lostFoundAgent.analyzeCrowdSentiment(buffer, cameraMetadata),
      lostFoundAgent.searchInCameraFeed(buffer, cameraMetadata)
    ]);

    // Store results in Firestore
    const frameAnalysis = {
      cameraId: cameraMetadata.cameraId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      crowdAnalysis,
      anomalyAnalysis,
      sentimentAnalysis,
      missingPersonMatches,
      processed: true
    };

    await db.collection('frame_analysis').add(frameAnalysis);

    // Process any high-priority alerts
    const allAlerts = [
      ...(crowdAnalysis.alerts || []),
      ...(anomalyAnalysis.alerts || []),
      ...(sentimentAnalysis.alerts || [])
    ];

    if (allAlerts.length > 0) {
      await processAlerts(allAlerts, cameraMetadata);
    }

    // Update real-time dashboard
    await updateDashboard(frameAnalysis);

    return {
      success: true,
      frameId: frameAnalysis.id,
      alertCount: allAlerts.length,
      missingPersonMatches: missingPersonMatches.length
    };

  } catch (error) {
    console.error('Error processing video frame:', error);
    throw new functions.https.HttpsError('internal', 'Failed to process video frame');
  }
});

/**
 * Handle emergency reports from mobile app or manual input
 */
exports.reportEmergency = functions.https.onCall(async (data, context) => {
  try {
    const emergency = {
      ...data,
      reportedBy: context.auth?.uid || 'anonymous',
      timestamp: new Date(),
      status: 'reported'
    };

    // Store emergency report
    const emergencyRef = await db.collection('emergencies').add(emergency);
    emergency.id = emergencyRef.id;

    // Process emergency through dispatch agent
    const dispatchResult = await dispatchAgent.processEmergency(emergency);

    // Update emergency record with dispatch info
    await emergencyRef.update({
      dispatchResult,
      status: dispatchResult.overallStatus === 'success' ? 'dispatched' : 'dispatch_failed',
      lastUpdate: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send real-time notifications
    await sendEmergencyNotifications(emergency, dispatchResult);

    return {
      success: true,
      emergencyId: emergency.id,
      dispatchStatus: dispatchResult.overallStatus,
      unitsDispatched: dispatchResult.dispatchResults?.length || 0
    };

  } catch (error) {
    console.error('Error reporting emergency:', error);
    throw new functions.https.HttpsError('internal', 'Failed to process emergency report');
  }
});

/**
 * Generate situational summary using Gemini
 */
exports.generateSituationalSummary = functions.https.onCall(async (data, context) => {
  try {
    const { query, context: queryContext } = data;

    // Generate summary using situational intelligence agent
    const summary = await situationalAgent.generateSummary(query, queryContext);

    // Store summary for reference
    await db.collection('situational_summaries').add({
      ...summary,
      requestedBy: context.auth?.uid || 'anonymous',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return summary;

  } catch (error) {
    console.error('Error generating situational summary:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate summary');
  }
});

/**
 * Report missing person
 */
exports.reportMissingPerson = functions.https.onCall(async (data, context) => {
  try {
    const { photo, description, lastKnownLocation, contactInfo } = data;

    // Process missing person report
    const result = await lostFoundAgent.reportMissingPerson({
      photo: Buffer.from(photo, 'base64'),
      description,
      lastKnownLocation,
      contactInfo,
      reportedBy: context.auth?.uid || 'anonymous'
    });

    // Store in Firestore
    await db.collection('missing_persons').doc(result.personId).set({
      ...result.searchProfile,
      reportedBy: context.auth?.uid || 'anonymous',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return result;

  } catch (error) {
    console.error('Error reporting missing person:', error);
    throw new functions.https.HttpsError('internal', 'Failed to report missing person');
  }
});

/**
 * Update unit location and status
 */
exports.updateUnitStatus = functions.https.onCall(async (data, context) => {
  try {
    const { unitId, location, status } = data;

    // Update dispatch agent
    if (location) {
      dispatchAgent.updateUnitLocation(unitId, location);
    }
    if (status) {
      dispatchAgent.updateUnitStatus(unitId, status);
    }

    // Update Firestore
    await db.collection('emergency_units').doc(unitId).update({
      currentLocation: location || admin.firestore.FieldValue.delete(),
      status: status || admin.firestore.FieldValue.delete(),
      lastUpdate: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };

  } catch (error) {
    console.error('Error updating unit status:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update unit status');
  }
});

/**
 * Get real-time dashboard data
 */
exports.getDashboardData = functions.https.onCall(async (data, context) => {
  try {
    const { timeRange = 30 } = data; // minutes
    const cutoff = new Date(Date.now() - timeRange * 60 * 1000);

    // Get recent data
    const [alerts, emergencies, crowdData, sentimentData] = await Promise.all([
      db.collection('alerts').where('timestamp', '>', cutoff).orderBy('timestamp', 'desc').limit(50).get(),
      db.collection('emergencies').where('timestamp', '>', cutoff).orderBy('timestamp', 'desc').limit(20).get(),
      db.collection('crowd_analytics').where('timestamp', '>', cutoff).orderBy('timestamp', 'desc').limit(100).get(),
      db.collection('sentiment_analysis').where('timestamp', '>', cutoff).orderBy('timestamp', 'desc').limit(50).get()
    ]);

    return {
      alerts: alerts.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      emergencies: emergencies.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      crowdData: crowdData.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      sentimentData: sentimentData.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      summary: {
        totalAlerts: alerts.size,
        activeEmergencies: emergencies.docs.filter(doc => doc.data().status === 'active').length,
        avgCrowdDensity: calculateAverageDensity(crowdData.docs),
        overallSentiment: calculateOverallSentiment(sentimentData.docs)
      }
    };

  } catch (error) {
    console.error('Error getting dashboard data:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get dashboard data');
  }
});

/**
 * Scheduled function to clean up old data
 */
exports.cleanupOldData = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  const collections = ['frame_analysis', 'alerts', 'crowd_analytics', 'sentiment_analysis'];
  
  for (const collection of collections) {
    const oldDocs = await db.collection(collection)
      .where('timestamp', '<', cutoff)
      .limit(500)
      .get();

    const batch = db.batch();
    oldDocs.docs.forEach(doc => batch.delete(doc.ref));
    
    if (oldDocs.size > 0) {
      await batch.commit();
      console.log(`Deleted ${oldDocs.size} old documents from ${collection}`);
    }
  }
});

/**
 * Real-time alert processing
 */
exports.processAlert = functions.firestore.document('alerts/{alertId}').onCreate(async (snap, context) => {
  const alert = snap.data();
  
  // Send notifications based on alert severity
  if (alert.severity === 'CRITICAL') {
    await sendCriticalAlertNotifications(alert);
  }
  
  // Update real-time dashboard
  await updateDashboardAlert(alert);
  
  // Log alert for analytics
  console.log(`Alert processed: ${alert.type} - ${alert.severity}`);
});

/**
 * Helper functions
 */
async function processAlerts(alerts, cameraMetadata) {
  const batch = db.batch();
  
  alerts.forEach(alert => {
    const alertRef = db.collection('alerts').doc();
    batch.set(alertRef, {
      ...alert,
      cameraId: cameraMetadata.cameraId,
      location: cameraMetadata.location,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      processed: false
    });
  });
  
  await batch.commit();
}

async function updateDashboard(frameAnalysis) {
  // Update real-time dashboard collection
  await db.collection('dashboard_updates').add({
    type: 'FRAME_ANALYSIS',
    data: frameAnalysis,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

async function sendEmergencyNotifications(emergency, dispatchResult) {
  const notification = {
    title: `${emergency.type} Emergency`,
    body: `Emergency at ${emergency.location}. ${dispatchResult.dispatchResults?.length || 0} units dispatched.`,
    data: {
      emergencyId: emergency.id,
      type: emergency.type,
      location: emergency.location
    }
  };

  // Send to all supervisors (in production, would have proper user management)
  const supervisors = await db.collection('users').where('role', '==', 'supervisor').get();
  
  const tokens = supervisors.docs
    .map(doc => doc.data().fcmToken)
    .filter(token => token);

  if (tokens.length > 0) {
    await admin.messaging().sendMulticast({
      tokens,
      notification,
      data: notification.data
    });
  }
}

async function sendCriticalAlertNotifications(alert) {
  const notification = {
    title: 'CRITICAL ALERT',
    body: `${alert.type}: ${alert.message}`,
    data: {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity
    }
  };

  // Send to all active users
  const users = await db.collection('users').where('status', '==', 'active').get();
  
  const tokens = users.docs
    .map(doc => doc.data().fcmToken)
    .filter(token => token);

  if (tokens.length > 0) {
    await admin.messaging().sendMulticast({
      tokens,
      notification,
      data: notification.data,
      android: {
        priority: 'high'
      },
      apns: {
        headers: {
          'apns-priority': '10'
        }
      }
    });
  }
}

async function updateDashboardAlert(alert) {
  await db.collection('dashboard_updates').add({
    type: 'ALERT',
    data: alert,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

function calculateAverageDensity(crowdDocs) {
  if (crowdDocs.length === 0) return 0;
  
  const densities = crowdDocs
    .map(doc => doc.data().crowdAnalysis?.currentMetrics?.density || 0)
    .filter(density => density > 0);
  
  return densities.length > 0 
    ? densities.reduce((sum, d) => sum + d, 0) / densities.length 
    : 0;
}

function calculateOverallSentiment(sentimentDocs) {
  if (sentimentDocs.length === 0) return 'NEUTRAL';
  
  const sentiments = sentimentDocs.map(doc => doc.data().sentimentAnalysis?.sentiment?.overall);
  const sentimentCounts = {};
  
  sentiments.forEach(sentiment => {
    if (sentiment) {
      sentimentCounts[sentiment] = (sentimentCounts[sentiment] || 0) + 1;
    }
  });
  
  // Return most common sentiment
  return Object.keys(sentimentCounts).reduce((a, b) => 
    sentimentCounts[a] > sentimentCounts[b] ? a : b, 'NEUTRAL'
  );
}

/**
 * Initialize emergency units on deployment
 */
exports.initializeUnits = functions.https.onCall(async (data, context) => {
  const defaultUnits = [
    {
      id: 'SECURITY-001',
      type: 'security',
      baseLocation: { lat: 37.7749, lng: -122.4194 },
      status: 'available',
      capabilities: ['crowd_control', 'general_security']
    },
    {
      id: 'MEDICAL-001',
      type: 'medic',
      baseLocation: { lat: 37.7849, lng: -122.4094 },
      status: 'available',
      capabilities: ['medical_emergency', 'first_aid']
    },
    {
      id: 'FIRE-001',
      type: 'fire_crew',
      baseLocation: { lat: 37.7649, lng: -122.4294 },
      status: 'available',
      capabilities: ['fire_suppression', 'evacuation']
    }
  ];

  // Initialize dispatch agent with units
  dispatchAgent.initializeUnits(defaultUnits);

  // Store units in Firestore
  const batch = db.batch();
  defaultUnits.forEach(unit => {
    const unitRef = db.collection('emergency_units').doc(unit.id);
    batch.set(unitRef, {
      ...unit,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
  
  await batch.commit();

  return { success: true, unitsInitialized: defaultUnits.length };
});

/**
 * Health check endpoint
 */
exports.healthCheck = functions.https.onRequest((req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      firestore: 'connected',
      agents: 'initialized'
    }
  });
});
