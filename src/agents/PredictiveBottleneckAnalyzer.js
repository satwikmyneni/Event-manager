/**
 * Predictive Bottleneck Analyzer
 * Uses Vertex AI Vision + Vertex AI Forecasting for 15-20 minute predictions
 */

const { PredictionServiceClient } = require('@google-cloud/aiplatform');
const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');

class PredictiveBottleneckAnalyzer {
  constructor() {
    this.predictionClient = new PredictionServiceClient();
    this.videoClient = new VideoIntelligenceServiceClient();
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT;
    this.location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    this.crowdHistory = new Map(); // Store historical data per camera
  }

  /**
   * Analyze crowd dynamics and predict bottlenecks 15-20 minutes in advance
   */
  async analyzeCrowdDynamics(videoFeed, cameraMetadata) {
    try {
      console.log(`Analyzing crowd dynamics for camera ${cameraMetadata.cameraId}`);
      
      // Step 1: Vertex AI Vision analysis for real-time crowd metrics
      const visionAnalysis = await this.processVideoWithVertexAI(videoFeed, cameraMetadata);
      
      // Step 2: Extract crowd metrics (density, velocity, flow patterns)
      const crowdMetrics = this.extractCrowdMetrics(visionAnalysis, cameraMetadata);
      
      // Step 3: Store historical data for forecasting
      this.updateCrowdHistory(cameraMetadata.cameraId, crowdMetrics);
      
      // Step 4: Generate 15-20 minute predictions using Vertex AI Forecasting
      const predictions = await this.generateBottleneckPredictions(cameraMetadata.cameraId);
      
      // Step 5: Identify proactive actions
      const proactiveActions = this.generateProactiveActions(predictions, crowdMetrics);
      
      return {
        timestamp: new Date(),
        cameraId: cameraMetadata.cameraId,
        currentMetrics: crowdMetrics,
        predictions: predictions,
        proactiveActions: proactiveActions,
        alertLevel: this.calculateAlertLevel(crowdMetrics, predictions)
      };

    } catch (error) {
      console.error('Error in crowd dynamics analysis:', error);
      throw error;
    }
  }

  /**
   * Process video feed using Vertex AI Vision
   */
  async processVideoWithVertexAI(videoFeed, metadata) {
    const request = {
      parent: `projects/${this.projectId}/locations/${this.location}`,
      inputConfig: {
        gcsSource: {
          uri: videoFeed.gcsUri || await this.uploadVideoToGCS(videoFeed)
        },
        mimeType: 'video/mp4'
      },
      features: [
        'OBJECT_TRACKING',
        'PERSON_DETECTION', 
        'MOTION_ANALYSIS',
        'CROWD_DENSITY_ESTIMATION'
      ],
      videoContext: {
        objectTrackingConfig: {
          model: 'builtin/latest'
        },
        personDetectionConfig: {
          includeBoundingBoxes: true,
          includePoseLandmarks: true,
          includeAttributes: true
        }
      }
    };

    const [operation] = await this.videoClient.annotateVideo(request);
    const [result] = await operation.promise();
    
    return result;
  }

  /**
   * Extract crowd metrics from Vertex AI Vision analysis
   */
  extractCrowdMetrics(visionAnalysis, metadata) {
    const annotations = visionAnalysis.annotationResults[0];
    
    // Extract person detections
    const personDetections = annotations.objectAnnotations?.filter(
      obj => obj.entity.description === 'person'
    ) || [];

    // Calculate crowd density
    const frameArea = metadata.frameWidth * metadata.frameHeight;
    const coverageArea = metadata.coverageAreaSqMeters || 1000;
    const peopleCount = personDetections.length;
    const density = peopleCount / (coverageArea / 100); // people per 100 sq meters
    const normalizedDensity = Math.min(1.0, density / 5); // normalize to 0-1

    // Calculate movement velocity
    const velocity = this.calculateCrowdVelocity(personDetections, metadata.cameraId);
    
    // Analyze flow patterns
    const flowPatterns = this.analyzeFlowPatterns(personDetections);
    
    // Detect congestion areas
    const congestionAreas = this.detectCongestionAreas(personDetections, metadata);
    
    // Calculate bottleneck risk score
    const bottleneckRisk = this.calculateBottleneckRisk(
      normalizedDensity, 
      velocity, 
      flowPatterns, 
      congestionAreas
    );

    return {
      peopleCount,
      density: normalizedDensity,
      velocity,
      flowPatterns,
      congestionAreas,
      bottleneckRisk,
      timestamp: new Date(),
      confidence: this.calculateConfidence(personDetections)
    };
  }

  /**
   * Calculate crowd movement velocity
   */
  calculateCrowdVelocity(currentDetections, cameraId) {
    const previousFrame = this.getPreviousFrameData(cameraId);
    if (!previousFrame) return 0;

    const velocities = [];
    
    // Match people between frames and calculate movement
    currentDetections.forEach(current => {
      const match = this.findBestMatch(current, previousFrame.detections);
      if (match) {
        const displacement = this.calculateDisplacement(current, match);
        const timeInterval = 1; // assuming 1 second between frames
        velocities.push(displacement / timeInterval);
      }
    });

    return velocities.length > 0 
      ? velocities.reduce((sum, v) => sum + v, 0) / velocities.length 
      : 0;
  }

  /**
   * Analyze crowd flow patterns
   */
  analyzeFlowPatterns(detections) {
    if (detections.length < 5) return { pattern: 'sparse', direction: null };

    // Calculate dominant movement direction
    const movements = detections.map(detection => {
      const track = detection.track;
      if (track && track.length > 1) {
        const start = track[0].normalizedBoundingBox;
        const end = track[track.length - 1].normalizedBoundingBox;
        return {
          dx: end.left - start.left,
          dy: end.top - start.top
        };
      }
      return null;
    }).filter(Boolean);

    if (movements.length === 0) return { pattern: 'static', direction: null };

    // Calculate average movement vector
    const avgMovement = {
      dx: movements.reduce((sum, m) => sum + m.dx, 0) / movements.length,
      dy: movements.reduce((sum, m) => sum + m.dy, 0) / movements.length
    };

    const magnitude = Math.sqrt(avgMovement.dx ** 2 + avgMovement.dy ** 2);
    const direction = Math.atan2(avgMovement.dy, avgMovement.dx) * (180 / Math.PI);

    // Classify flow pattern
    let pattern = 'normal';
    if (magnitude > 0.1) {
      pattern = 'directional_flow';
    } else if (this.detectConvergingFlow(movements)) {
      pattern = 'converging';
    } else if (this.detectDivergingFlow(movements)) {
      pattern = 'diverging';
    }

    return {
      pattern,
      direction,
      magnitude,
      coherence: this.calculateFlowCoherence(movements)
    };
  }

  /**
   * Detect congestion areas in the frame
   */
  detectCongestionAreas(detections, metadata) {
    const gridSize = 10;
    const cellWidth = metadata.frameWidth / gridSize;
    const cellHeight = metadata.frameHeight / gridSize;
    const grid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));

    // Count people in each grid cell
    detections.forEach(detection => {
      const bbox = detection.normalizedBoundingBox;
      const centerX = bbox.left + bbox.width / 2;
      const centerY = bbox.top + bbox.height / 2;
      
      const gridX = Math.min(gridSize - 1, Math.floor(centerX * gridSize));
      const gridY = Math.min(gridSize - 1, Math.floor(centerY * gridSize));
      
      grid[gridY][gridX]++;
    });

    // Identify high-density cells as congestion areas
    const congestionAreas = [];
    const avgDensity = detections.length / (gridSize * gridSize);
    const congestionThreshold = avgDensity * 2;

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (grid[y][x] > congestionThreshold) {
          congestionAreas.push({
            x: x * cellWidth,
            y: y * cellHeight,
            width: cellWidth,
            height: cellHeight,
            density: grid[y][x],
            severity: grid[y][x] / congestionThreshold
          });
        }
      }
    }

    return congestionAreas;
  }

  /**
   * Generate bottleneck predictions using Vertex AI Forecasting
   */
  async generateBottleneckPredictions(cameraId) {
    const historicalData = this.getCrowdHistory(cameraId);
    
    if (historicalData.length < 10) {
      return {
        predictedBottlenecks: [],
        timeToBottleneck: null,
        confidence: 0.3,
        message: 'Insufficient historical data for accurate prediction'
      };
    }

    try {
      // Prepare time series data for Vertex AI Forecasting
      const timeSeriesData = this.prepareTimeSeriesData(historicalData);
      
      const endpoint = `projects/${this.projectId}/locations/${this.location}/endpoints/crowd-forecasting`;
      
      const request = {
        endpoint,
        instances: [{
          time_series_data: timeSeriesData,
          forecast_horizon: 20, // 20 minutes
          confidence_level: 0.8
        }]
      };

      const [response] = await this.predictionClient.predict(request);
      const predictions = response.predictions[0];

      // Process forecasting results
      const bottleneckPredictions = this.processForcastingResults(predictions);
      
      return {
        predictedBottlenecks: bottleneckPredictions.bottlenecks,
        timeToBottleneck: bottleneckPredictions.timeToAlert,
        confidence: predictions.confidence,
        forecastHorizon: 20,
        riskLevel: this.calculateRiskLevel(bottleneckPredictions)
      };

    } catch (error) {
      console.error('Error in bottleneck prediction:', error);
      
      // Fallback to simple trend analysis
      return this.generateSimplePrediction(historicalData);
    }
  }

  /**
   * Generate proactive actions based on predictions
   */
  generateProactiveActions(predictions, currentMetrics) {
    const actions = [];

    // High bottleneck risk actions
    if (predictions.riskLevel === 'HIGH' || currentMetrics.bottleneckRisk > 0.8) {
      actions.push({
        priority: 'CRITICAL',
        action: 'DEPLOY_CROWD_BARRIERS',
        description: 'Deploy moveable barriers to redirect crowd flow',
        location: predictions.predictedBottlenecks[0]?.location,
        timeframe: 'IMMEDIATE'
      });

      actions.push({
        priority: 'HIGH',
        action: 'INCREASE_SECURITY_PRESENCE',
        description: 'Deploy additional security personnel to high-risk areas',
        personnel: Math.ceil(currentMetrics.peopleCount / 100),
        timeframe: '5_MINUTES'
      });
    }

    // Medium risk actions
    if (predictions.riskLevel === 'MEDIUM' || currentMetrics.bottleneckRisk > 0.6) {
      actions.push({
        priority: 'MEDIUM',
        action: 'ACTIVATE_ALTERNATIVE_ROUTES',
        description: 'Open and clearly mark alternative pathways',
        routes: this.identifyAlternativeRoutes(currentMetrics),
        timeframe: '10_MINUTES'
      });

      actions.push({
        priority: 'MEDIUM',
        action: 'CROWD_COMMUNICATION',
        description: 'Broadcast crowd management announcements',
        message: this.generateCrowdMessage(currentMetrics),
        timeframe: 'IMMEDIATE'
      });
    }

    // Predictive actions based on time to bottleneck
    if (predictions.timeToBottleneck && predictions.timeToBottleneck < 20) {
      actions.push({
        priority: 'HIGH',
        action: 'PREEMPTIVE_CROWD_DIVERSION',
        description: `Bottleneck predicted in ${predictions.timeToBottleneck} minutes - begin crowd diversion`,
        diversionRoutes: this.calculateDiversionRoutes(predictions.predictedBottlenecks),
        timeframe: 'IMMEDIATE'
      });
    }

    return {
      actions,
      totalActions: actions.length,
      highPriorityActions: actions.filter(a => a.priority === 'HIGH' || a.priority === 'CRITICAL').length,
      estimatedEffectiveness: this.calculateActionEffectiveness(actions, currentMetrics)
    };
  }

  /**
   * Calculate bottleneck risk score
   */
  calculateBottleneckRisk(density, velocity, flowPatterns, congestionAreas) {
    let risk = 0;

    // Density factor (0-0.4)
    risk += Math.min(0.4, density * 0.4);

    // Velocity factor (0-0.2) - very high or very low velocity increases risk
    const velocityRisk = velocity > 2.0 ? 0.2 : (velocity < 0.1 ? 0.15 : velocity * 0.1);
    risk += velocityRisk;

    // Flow pattern factor (0-0.2)
    if (flowPatterns.pattern === 'converging') risk += 0.2;
    else if (flowPatterns.pattern === 'static') risk += 0.15;
    else if (flowPatterns.coherence < 0.3) risk += 0.1; // chaotic flow

    // Congestion areas factor (0-0.2)
    const congestionRisk = Math.min(0.2, congestionAreas.length * 0.05);
    risk += congestionRisk;

    return Math.min(1.0, risk);
  }

  /**
   * Calculate alert level based on current metrics and predictions
   */
  calculateAlertLevel(metrics, predictions) {
    const riskScore = Math.max(metrics.bottleneckRisk, predictions.confidence * 0.8);
    
    if (riskScore > 0.8) return 'CRITICAL';
    if (riskScore > 0.6) return 'HIGH';
    if (riskScore > 0.4) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Helper methods
   */
  updateCrowdHistory(cameraId, metrics) {
    if (!this.crowdHistory.has(cameraId)) {
      this.crowdHistory.set(cameraId, []);
    }
    
    const history = this.crowdHistory.get(cameraId);
    history.push({
      timestamp: new Date(),
      ...metrics
    });

    // Keep only last 100 data points
    if (history.length > 100) {
      history.shift();
    }
  }

  getCrowdHistory(cameraId) {
    return this.crowdHistory.get(cameraId) || [];
  }

  getPreviousFrameData(cameraId) {
    const history = this.getCrowdHistory(cameraId);
    return history.length > 1 ? history[history.length - 2] : null;
  }

  prepareTimeSeriesData(historicalData) {
    return historicalData.map(data => ({
      timestamp: data.timestamp.toISOString(),
      density: data.density,
      velocity: data.velocity,
      bottleneck_risk: data.bottleneckRisk,
      people_count: data.peopleCount
    }));
  }

  processForcastingResults(predictions) {
    // Process Vertex AI Forecasting results
    const bottlenecks = [];
    let timeToAlert = null;

    predictions.forecast_values.forEach((value, index) => {
      const minutesFromNow = index + 1;
      
      if (value.bottleneck_risk > 0.8) {
        bottlenecks.push({
          timeFromNow: minutesFromNow,
          riskLevel: value.bottleneck_risk,
          predictedDensity: value.density,
          location: value.predicted_location
        });
        
        if (!timeToAlert) {
          timeToAlert = minutesFromNow;
        }
      }
    });

    return { bottlenecks, timeToAlert };
  }

  generateSimplePrediction(historicalData) {
    // Simple trend-based prediction as fallback
    const recentData = historicalData.slice(-5);
    const trend = this.calculateTrend(recentData.map(d => d.bottleneckRisk));
    
    const currentRisk = recentData[recentData.length - 1].bottleneckRisk;
    const predictedRisk = Math.min(1.0, currentRisk + trend * 20);
    
    return {
      predictedBottlenecks: predictedRisk > 0.8 ? [{
        timeFromNow: Math.ceil((0.8 - currentRisk) / trend),
        riskLevel: predictedRisk,
        location: 'predicted_high_density_area'
      }] : [],
      timeToBottleneck: predictedRisk > 0.8 ? Math.ceil((0.8 - currentRisk) / trend) : null,
      confidence: 0.6,
      riskLevel: predictedRisk > 0.8 ? 'HIGH' : (predictedRisk > 0.6 ? 'MEDIUM' : 'LOW')
    };
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + index * val, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  // Additional helper methods would be implemented here...
  findBestMatch(current, previousDetections) { /* implementation */ }
  calculateDisplacement(current, previous) { /* implementation */ }
  detectConvergingFlow(movements) { /* implementation */ }
  detectDivergingFlow(movements) { /* implementation */ }
  calculateFlowCoherence(movements) { /* implementation */ }
  calculateConfidence(detections) { return Math.min(0.95, detections.length / 10); }
  calculateRiskLevel(predictions) { /* implementation */ }
  identifyAlternativeRoutes(metrics) { /* implementation */ }
  generateCrowdMessage(metrics) { /* implementation */ }
  calculateDiversionRoutes(bottlenecks) { /* implementation */ }
  calculateActionEffectiveness(actions, metrics) { /* implementation */ }
  uploadVideoToGCS(videoFeed) { /* implementation */ }
}

module.exports = PredictiveBottleneckAnalyzer;
