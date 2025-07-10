/**
 * Project Drishti Free - Main Server
 * 100% Free & Open Source Situational Awareness Platform
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Import free AI agents
const LocalCrowdAnalytics = require('./agents/LocalCrowdAnalytics');
const LocalAIIntelligence = require('./agents/LocalAIIntelligence');
const LocalEmergencyDispatch = require('./agents/LocalEmergencyDispatch');
const LocalAnomalyDetection = require('./agents/LocalAnomalyDetection');
const LocalPersonTracking = require('./agents/LocalPersonTracking');

// Import utilities
const Database = require('./utils/Database');
const Logger = require('./utils/Logger');
const VideoProcessor = require('./utils/VideoProcessor');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize components
const db = new Database();
const logger = new Logger();
const videoProcessor = new VideoProcessor();

// Initialize AI agents
const crowdAgent = new LocalCrowdAnalytics();
const aiAgent = new LocalAIIntelligence();
const dispatchAgent = new LocalEmergencyDispatch();
const anomalyAgent = new LocalAnomalyDetection();
const personAgent = new LocalPersonTracking();

// Store active connections
const activeConnections = new Map();
const cameraFeeds = new Map();

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0-free',
    services: {
      database: db.isConnected(),
      ai_models: aiAgent.isReady(),
      video_processor: videoProcessor.isReady()
    }
  });
});

// Process video frame
app.post('/api/process-frame', async (req, res) => {
  try {
    const { imageData, cameraId, metadata } = req.body;
    
    logger.info(`Processing frame from camera ${cameraId}`);
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageData, 'base64');
    
    // Process frame through all agents in parallel
    const [crowdAnalysis, anomalyAnalysis, personMatches] = await Promise.all([
      crowdAgent.analyzeFrame(imageBuffer, { cameraId, ...metadata }),
      anomalyAgent.detectAnomalies(imageBuffer, { cameraId, ...metadata }),
      personAgent.searchInFrame(imageBuffer, { cameraId, ...metadata })
    ]);
    
    // Store results in database
    const frameResult = {
      cameraId,
      timestamp: new Date(),
      crowdAnalysis,
      anomalyAnalysis,
      personMatches,
      metadata
    };
    
    await db.storeFrameAnalysis(frameResult);
    
    // Emit real-time updates
    io.emit('frame-analysis', frameResult);
    
    // Check for alerts
    const alerts = [];
    if (crowdAnalysis.alerts) alerts.push(...crowdAnalysis.alerts);
    if (anomalyAnalysis.alerts) alerts.push(...anomalyAnalysis.alerts);
    
    if (alerts.length > 0) {
      await processAlerts(alerts, { cameraId, ...metadata });
    }
    
    res.json({
      success: true,
      frameId: frameResult.id,
      alertCount: alerts.length,
      processingTime: Date.now() - frameResult.timestamp.getTime()
    });
    
  } catch (error) {
    logger.error('Error processing frame:', error);
    res.status(500).json({ error: 'Failed to process frame' });
  }
});

// Generate AI summary
app.post('/api/generate-summary', async (req, res) => {
  try {
    const { query, context } = req.body;
    
    logger.info(`Generating AI summary for query: ${query}`);
    
    // Get relevant data from database
    const relevantData = await gatherRelevantData(query, context);
    
    // Generate summary using local AI
    const summary = await aiAgent.generateSummary(query, relevantData, context);
    
    // Store summary
    await db.storeSummary({
      query,
      summary,
      context,
      timestamp: new Date()
    });
    
    res.json(summary);
    
  } catch (error) {
    logger.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Report emergency
app.post('/api/report-emergency', async (req, res) => {
  try {
    const emergency = {
      ...req.body,
      id: generateId(),
      timestamp: new Date(),
      status: 'reported'
    };
    
    logger.info(`Emergency reported: ${emergency.type} at ${emergency.location}`);
    
    // Store emergency
    await db.storeEmergency(emergency);
    
    // Process through dispatch agent
    const dispatchResult = await dispatchAgent.processEmergency(emergency);
    
    // Update emergency with dispatch info
    await db.updateEmergency(emergency.id, {
      dispatchResult,
      status: dispatchResult.success ? 'dispatched' : 'failed'
    });
    
    // Emit real-time update
    io.emit('emergency-update', { emergency, dispatchResult });
    
    // Send notifications
    await sendNotifications(emergency, dispatchResult);
    
    res.json({
      success: true,
      emergencyId: emergency.id,
      dispatchResult
    });
    
  } catch (error) {
    logger.error('Error reporting emergency:', error);
    res.status(500).json({ error: 'Failed to report emergency' });
  }
});

// Report missing person
app.post('/api/report-missing-person', async (req, res) => {
  try {
    const { photo, description, lastKnownLocation, contactInfo } = req.body;
    
    const personReport = {
      id: generateId(),
      photo: Buffer.from(photo, 'base64'),
      description,
      lastKnownLocation,
      contactInfo,
      timestamp: new Date(),
      status: 'active'
    };
    
    logger.info(`Missing person reported: ${description}`);
    
    // Process through person tracking agent
    const searchResult = await personAgent.reportMissingPerson(personReport);
    
    // Store in database
    await db.storeMissingPerson({ ...personReport, searchResult });
    
    // Start active search
    personAgent.startActiveSearch(personReport.id);
    
    res.json({
      success: true,
      personId: personReport.id,
      searchResult
    });
    
  } catch (error) {
    logger.error('Error reporting missing person:', error);
    res.status(500).json({ error: 'Failed to report missing person' });
  }
});

// Get dashboard data
app.get('/api/dashboard', async (req, res) => {
  try {
    const timeRange = parseInt(req.query.timeRange) || 30; // minutes
    const cutoff = new Date(Date.now() - timeRange * 60 * 1000);
    
    const [alerts, emergencies, crowdData, sentimentData] = await Promise.all([
      db.getAlerts({ since: cutoff, limit: 50 }),
      db.getEmergencies({ since: cutoff, limit: 20 }),
      db.getCrowdData({ since: cutoff, limit: 100 }),
      db.getSentimentData({ since: cutoff, limit: 50 })
    ]);
    
    const summary = {
      totalAlerts: alerts.length,
      activeEmergencies: emergencies.filter(e => e.status === 'active').length,
      avgCrowdDensity: calculateAverageDensity(crowdData),
      overallSentiment: calculateOverallSentiment(sentimentData)
    };
    
    res.json({
      alerts,
      emergencies,
      crowdData,
      sentimentData,
      summary
    });
    
  } catch (error) {
    logger.error('Error getting dashboard data:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// WebSocket connections
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  activeConnections.set(socket.id, socket);
  
  // Send current status
  socket.emit('system-status', {
    connected: true,
    timestamp: new Date(),
    activeConnections: activeConnections.size
  });
  
  // Handle camera feed registration
  socket.on('register-camera', (cameraInfo) => {
    cameraFeeds.set(cameraInfo.cameraId, {
      ...cameraInfo,
      socketId: socket.id,
      lastSeen: new Date()
    });
    logger.info(`Camera registered: ${cameraInfo.cameraId}`);
  });
  
  // Handle real-time video frames
  socket.on('video-frame', async (data) => {
    try {
      const { cameraId, imageData, metadata } = data;
      
      // Process frame (simplified for real-time)
      const quickAnalysis = await videoProcessor.quickAnalysis(imageData, metadata);
      
      // Broadcast to dashboard
      socket.broadcast.emit('live-frame', {
        cameraId,
        analysis: quickAnalysis,
        timestamp: new Date()
      });
      
    } catch (error) {
      logger.error('Error processing live frame:', error);
    }
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
    activeConnections.delete(socket.id);
    
    // Remove camera feeds from this socket
    for (const [cameraId, feed] of cameraFeeds.entries()) {
      if (feed.socketId === socket.id) {
        cameraFeeds.delete(cameraId);
      }
    }
  });
});

// Utility functions
async function processAlerts(alerts, metadata) {
  for (const alert of alerts) {
    // Store alert
    await db.storeAlert({
      ...alert,
      cameraId: metadata.cameraId,
      location: metadata.location,
      timestamp: new Date()
    });
    
    // Emit real-time alert
    io.emit('alert', alert);
    
    // Send notifications for critical alerts
    if (alert.severity === 'CRITICAL') {
      await sendCriticalAlert(alert);
    }
  }
}

async function gatherRelevantData(query, context) {
  const timeRange = context.timeRange || 30; // minutes
  const cutoff = new Date(Date.now() - timeRange * 60 * 1000);
  
  return {
    alerts: await db.getAlerts({ since: cutoff }),
    emergencies: await db.getEmergencies({ since: cutoff }),
    crowdData: await db.getCrowdData({ since: cutoff }),
    sentimentData: await db.getSentimentData({ since: cutoff })
  };
}

async function sendNotifications(emergency, dispatchResult) {
  // Implementation for free notification services
  // Could use email, SMS via free tiers, webhooks, etc.
  logger.info(`Sending notifications for emergency ${emergency.id}`);
}

async function sendCriticalAlert(alert) {
  // Send critical alerts via multiple channels
  logger.warn(`CRITICAL ALERT: ${alert.type} - ${alert.message}`);
  io.emit('critical-alert', alert);
}

function calculateAverageDensity(crowdData) {
  if (crowdData.length === 0) return 0;
  const densities = crowdData.map(d => d.density).filter(d => d > 0);
  return densities.length > 0 ? densities.reduce((a, b) => a + b) / densities.length : 0;
}

function calculateOverallSentiment(sentimentData) {
  if (sentimentData.length === 0) return 'NEUTRAL';
  const sentiments = sentimentData.map(d => d.sentiment);
  const counts = {};
  sentiments.forEach(s => counts[s] = (counts[s] || 0) + 1);
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info(`Project Drishti Free server running on port ${PORT}`);
  logger.info('🆓 100% Free & Open Source - No billing required!');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await db.close();
  server.close();
});

module.exports = { app, server, io };
