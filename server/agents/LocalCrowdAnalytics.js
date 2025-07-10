/**
 * Local Crowd Analytics Agent
 * Uses OpenCV and local algorithms for crowd analysis
 */

const cv = require('opencv4nodejs');
const tf = require('@tensorflow/tfjs-node');

class LocalCrowdAnalytics {
  constructor() {
    this.frameHistory = new Map(); // Store frame history per camera
    this.crowdHistory = [];
    this.alertThresholds = {
      density: 0.8,
      velocity: 2.5,
      congestion: 0.9
    };
    this.isInitialized = false;
    this.initialize();
  }

  async initialize() {
    try {
      // Load or create simple crowd detection model
      this.personDetector = await this.initializePersonDetector();
      this.motionDetector = new cv.BackgroundSubtractorMOG2();
      this.isInitialized = true;
      console.log('Local Crowd Analytics Agent initialized');
    } catch (error) {
      console.error('Failed to initialize crowd analytics:', error);
      this.isInitialized = false;
    }
  }

  async initializePersonDetector() {
    // Use OpenCV's HOG descriptor for person detection
    const hog = new cv.HOGDescriptor();
    hog.setSVMDetector(cv.HOGDescriptor.getDefaultPeopleDetector());
    return hog;
  }

  isReady() {
    return this.isInitialized;
  }

  /**
   * Analyze video frame for crowd metrics
   */
  async analyzeFrame(imageBuffer, metadata) {
    if (!this.isInitialized) {
      return this.generateFallbackAnalysis(metadata);
    }

    try {
      // Convert buffer to OpenCV Mat
      const mat = cv.imdecode(imageBuffer);
      const { cameraId } = metadata;

      // Detect people in the frame
      const people = await this.detectPeople(mat);
      
      // Calculate crowd metrics
      const crowdMetrics = this.calculateCrowdMetrics(people, metadata, mat);
      
      // Analyze motion if we have previous frame
      const motionAnalysis = await this.analyzeMotion(mat, cameraId);
      
      // Generate predictions
      const predictions = this.generatePredictions(crowdMetrics, cameraId);
      
      // Check for alerts
      const alerts = this.checkAlerts(crowdMetrics, predictions, metadata);
      
      // Store frame history
      this.storeFrameHistory(cameraId, mat, crowdMetrics);
      
      return {
        currentMetrics: crowdMetrics,
        motionAnalysis,
        predictions,
        alerts,
        peopleCount: people.length,
        timestamp: new Date(),
        cameraId
      };

    } catch (error) {
      console.error('Error analyzing frame:', error);
      return this.generateFallbackAnalysis(metadata);
    }
  }

  /**
   * Detect people in the frame using HOG descriptor
   */
  async detectPeople(mat) {
    try {
      // Resize for faster processing
      const resized = mat.resize(640, 480);
      
      // Detect people using HOG
      const detections = this.personDetector.detectMultiScale(resized, {
        hitThreshold: 0,
        winStride: new cv.Size(8, 8),
        padding: new cv.Size(32, 32),
        scale: 1.05,
        finalThreshold: 2,
        useMeanshiftGrouping: false
      });

      // Filter detections by confidence
      const people = detections.objects.filter((detection, index) => 
        detections.weights[index] > 0.5
      );

      return people.map((rect, index) => ({
        boundingBox: rect,
        confidence: detections.weights[index],
        center: {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2
        }
      }));

    } catch (error) {
      console.error('Error detecting people:', error);
      return [];
    }
  }

  /**
   * Calculate crowd density and movement metrics
   */
  calculateCrowdMetrics(people, metadata, mat) {
    const frameArea = mat.rows * mat.cols;
    const coverageArea = metadata.coverageArea || 1000; // square meters
    
    // Calculate density
    const density = people.length / (coverageArea / 100); // people per 100 sq meters
    const normalizedDensity = Math.min(1, density / 5); // normalize to 0-1

    // Calculate distribution
    const distribution = this.calculateSpatialDistribution(people, mat);
    
    // Calculate crowd patterns
    const patterns = this.detectCrowdPatterns(people);
    
    // Estimate velocity from previous frame
    const velocity = this.estimateVelocity(people, metadata.cameraId);
    
    // Calculate congestion level
    const congestionLevel = this.calculateCongestion(normalizedDensity, velocity, distribution);

    return {
      density: normalizedDensity,
      peopleCount: people.length,
      velocity,
      distribution,
      patterns,
      congestionLevel,
      frameArea,
      coverageArea
    };
  }

  /**
   * Analyze motion between frames
   */
  async analyzeMotion(currentMat, cameraId) {
    const previousFrame = this.getPreviousFrame(cameraId);
    if (!previousFrame) {
      return { hasMotion: false, motionAreas: [] };
    }

    try {
      // Apply background subtraction
      const fgMask = this.motionDetector.apply(currentMat);
      
      // Find contours in motion mask
      const contours = fgMask.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      // Filter significant motion areas
      const motionAreas = contours
        .filter(contour => contour.area > 500) // Minimum area threshold
        .map(contour => ({
          area: contour.area,
          boundingRect: contour.boundingRect(),
          center: this.getContourCenter(contour)
        }));

      // Calculate overall motion intensity
      const motionIntensity = motionAreas.reduce((sum, area) => sum + area.area, 0) / (currentMat.rows * currentMat.cols);

      return {
        hasMotion: motionAreas.length > 0,
        motionAreas,
        motionIntensity,
        motionCount: motionAreas.length
      };

    } catch (error) {
      console.error('Error analyzing motion:', error);
      return { hasMotion: false, motionAreas: [] };
    }
  }

  /**
   * Generate predictions based on historical data
   */
  generatePredictions(currentMetrics, cameraId) {
    const history = this.getRecentHistory(cameraId, 10); // Last 10 frames
    
    if (history.length < 3) {
      return {
        predictedDensity: currentMetrics.density,
        predictedCongestion: currentMetrics.congestionLevel,
        confidence: 0.3,
        timeToAlert: null
      };
    }

    // Simple linear trend prediction
    const densityTrend = this.calculateTrend(history.map(h => h.density));
    const congestionTrend = this.calculateTrend(history.map(h => h.congestionLevel));

    // Predict next 20 minutes (assuming 1 frame per minute)
    const predictedDensity = Math.max(0, Math.min(1, currentMetrics.density + densityTrend * 20));
    const predictedCongestion = Math.max(0, Math.min(1, currentMetrics.congestionLevel + congestionTrend * 20));

    // Calculate time to alert threshold
    let timeToAlert = null;
    if (densityTrend > 0) {
      const timeToThreshold = (this.alertThresholds.density - currentMetrics.density) / densityTrend;
      if (timeToThreshold > 0 && timeToThreshold < 30) {
        timeToAlert = Math.round(timeToThreshold);
      }
    }

    return {
      predictedDensity,
      predictedCongestion,
      densityTrend,
      congestionTrend,
      confidence: Math.min(0.9, history.length / 10),
      timeToAlert,
      recommendations: this.generateRecommendations(predictedDensity, predictedCongestion)
    };
  }

  /**
   * Check for alert conditions
   */
  checkAlerts(metrics, predictions, metadata) {
    const alerts = [];

    // High density alert
    if (metrics.density > this.alertThresholds.density) {
      alerts.push({
        type: 'HIGH_DENSITY',
        severity: 'WARNING',
        message: `Crowd density at ${(metrics.density * 100).toFixed(1)}%`,
        location: metadata.location,
        confidence: 0.9,
        timestamp: new Date()
      });
    }

    // High velocity alert (potential panic)
    if (metrics.velocity > this.alertThresholds.velocity) {
      alerts.push({
        type: 'HIGH_VELOCITY',
        severity: 'CRITICAL',
        message: `High crowd movement: ${metrics.velocity.toFixed(1)} m/s`,
        location: metadata.location,
        confidence: 0.85,
        timestamp: new Date()
      });
    }

    // Predictive alert
    if (predictions.timeToAlert && predictions.timeToAlert < 20) {
      alerts.push({
        type: 'PREDICTIVE_CROWDING',
        severity: 'WARNING',
        message: `High density predicted in ${predictions.timeToAlert} minutes`,
        location: metadata.location,
        confidence: predictions.confidence,
        timestamp: new Date(),
        recommendations: predictions.recommendations
      });
    }

    // Congestion alert
    if (metrics.congestionLevel > this.alertThresholds.congestion) {
      alerts.push({
        type: 'HIGH_CONGESTION',
        severity: 'HIGH',
        message: `Severe congestion detected: ${(metrics.congestionLevel * 100).toFixed(1)}%`,
        location: metadata.location,
        confidence: 0.8,
        timestamp: new Date()
      });
    }

    return alerts;
  }

  /**
   * Calculate spatial distribution of people
   */
  calculateSpatialDistribution(people, mat) {
    if (people.length === 0) return { uniformity: 1, hotspots: [] };

    const gridSize = 10;
    const cellWidth = mat.cols / gridSize;
    const cellHeight = mat.rows / gridSize;
    const grid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));

    // Count people in each grid cell
    people.forEach(person => {
      const gridX = Math.min(gridSize - 1, Math.floor(person.center.x / cellWidth));
      const gridY = Math.min(gridSize - 1, Math.floor(person.center.y / cellHeight));
      grid[gridY][gridX]++;
    });

    // Calculate uniformity (how evenly distributed)
    const expectedPerCell = people.length / (gridSize * gridSize);
    let variance = 0;
    const hotspots = [];

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const count = grid[y][x];
        variance += Math.pow(count - expectedPerCell, 2);
        
        // Identify hotspots (cells with significantly more people)
        if (count > expectedPerCell * 2) {
          hotspots.push({
            x: x * cellWidth + cellWidth / 2,
            y: y * cellHeight + cellHeight / 2,
            count,
            intensity: count / expectedPerCell
          });
        }
      }
    }

    const uniformity = 1 - (variance / (people.length * people.length));

    return {
      uniformity: Math.max(0, uniformity),
      hotspots,
      gridDistribution: grid
    };
  }

  /**
   * Detect crowd patterns (clustering, queuing, etc.)
   */
  detectCrowdPatterns(people) {
    if (people.length < 3) return { pattern: 'sparse', clusters: [] };

    // Simple clustering using distance threshold
    const clusters = this.findClusters(people, 50); // 50 pixel threshold
    
    // Analyze cluster shapes to determine patterns
    let pattern = 'normal';
    if (clusters.length === 1 && clusters[0].length > people.length * 0.8) {
      pattern = 'dense_cluster';
    } else if (clusters.length > people.length * 0.3) {
      pattern = 'dispersed';
    } else if (this.isLinearPattern(people)) {
      pattern = 'queue';
    }

    return {
      pattern,
      clusters: clusters.map(cluster => ({
        size: cluster.length,
        center: this.calculateClusterCenter(cluster),
        density: cluster.length / this.calculateClusterArea(cluster)
      }))
    };
  }

  /**
   * Estimate crowd velocity from frame comparison
   */
  estimateVelocity(currentPeople, cameraId) {
    const previousFrame = this.getPreviousFrame(cameraId);
    if (!previousFrame || !previousFrame.people) return 0;

    const previousPeople = previousFrame.people;
    const matches = this.matchPeopleBetweenFrames(previousPeople, currentPeople);
    
    if (matches.length === 0) return 0;

    // Calculate average displacement
    const displacements = matches.map(match => {
      const dx = match.current.center.x - match.previous.center.x;
      const dy = match.current.center.y - match.previous.center.y;
      return Math.sqrt(dx * dx + dy * dy);
    });

    const avgDisplacement = displacements.reduce((sum, d) => sum + d, 0) / displacements.length;
    
    // Convert pixels to meters (rough estimation)
    const pixelsPerMeter = 100; // Configurable based on camera setup
    const metersPerSecond = avgDisplacement / pixelsPerMeter;

    return metersPerSecond;
  }

  /**
   * Calculate congestion level
   */
  calculateCongestion(density, velocity, distribution) {
    // High density + low velocity + low uniformity = high congestion
    const densityFactor = density;
    const velocityFactor = Math.max(0, 1 - velocity / 3); // Normalize velocity
    const distributionFactor = 1 - distribution.uniformity;

    return Math.min(1, (densityFactor * 0.5) + (velocityFactor * 0.3) + (distributionFactor * 0.2));
  }

  /**
   * Helper methods
   */
  findClusters(people, threshold) {
    const clusters = [];
    const visited = new Set();

    people.forEach((person, index) => {
      if (visited.has(index)) return;

      const cluster = [person];
      visited.add(index);

      // Find nearby people
      people.forEach((otherPerson, otherIndex) => {
        if (visited.has(otherIndex)) return;

        const distance = Math.sqrt(
          Math.pow(person.center.x - otherPerson.center.x, 2) +
          Math.pow(person.center.y - otherPerson.center.y, 2)
        );

        if (distance < threshold) {
          cluster.push(otherPerson);
          visited.add(otherIndex);
        }
      });

      clusters.push(cluster);
    });

    return clusters;
  }

  isLinearPattern(people) {
    if (people.length < 5) return false;

    // Check if people form roughly linear arrangement
    const points = people.map(p => [p.center.x, p.center.y]);
    
    // Simple linear regression to check linearity
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p[0], 0);
    const sumY = points.reduce((sum, p) => sum + p[1], 0);
    const sumXY = points.reduce((sum, p) => sum + p[0] * p[1], 0);
    const sumXX = points.reduce((sum, p) => sum + p[0] * p[0], 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    let ssRes = 0, ssTot = 0;
    
    points.forEach(p => {
      const yPred = slope * p[0] + intercept;
      ssRes += Math.pow(p[1] - yPred, 2);
      ssTot += Math.pow(p[1] - yMean, 2);
    });

    const rSquared = 1 - (ssRes / ssTot);
    return rSquared > 0.7; // Strong linear correlation
  }

  calculateClusterCenter(cluster) {
    const sumX = cluster.reduce((sum, p) => sum + p.center.x, 0);
    const sumY = cluster.reduce((sum, p) => sum + p.center.y, 0);
    return {
      x: sumX / cluster.length,
      y: sumY / cluster.length
    };
  }

  calculateClusterArea(cluster) {
    if (cluster.length < 3) return 100; // Default small area

    const points = cluster.map(p => [p.center.x, p.center.y]);
    
    // Calculate convex hull area (simplified)
    const minX = Math.min(...points.map(p => p[0]));
    const maxX = Math.max(...points.map(p => p[0]));
    const minY = Math.min(...points.map(p => p[1]));
    const maxY = Math.max(...points.map(p => p[1]));

    return (maxX - minX) * (maxY - minY);
  }

  matchPeopleBetweenFrames(previousPeople, currentPeople) {
    const matches = [];
    const used = new Set();

    previousPeople.forEach(prevPerson => {
      let bestMatch = null;
      let bestDistance = Infinity;

      currentPeople.forEach((currPerson, index) => {
        if (used.has(index)) return;

        const distance = Math.sqrt(
          Math.pow(prevPerson.center.x - currPerson.center.x, 2) +
          Math.pow(prevPerson.center.y - currPerson.center.y, 2)
        );

        if (distance < bestDistance && distance < 100) { // Max 100 pixel movement
          bestDistance = distance;
          bestMatch = { current: currPerson, index };
        }
      });

      if (bestMatch) {
        matches.push({
          previous: prevPerson,
          current: bestMatch.current,
          distance: bestDistance
        });
        used.add(bestMatch.index);
      }
    });

    return matches;
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + index * val, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squared indices

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  generateRecommendations(predictedDensity, predictedCongestion) {
    const recommendations = [];

    if (predictedDensity > 0.9) {
      recommendations.push('Implement immediate crowd diversion');
      recommendations.push('Deploy additional security personnel');
      recommendations.push('Consider temporary entry restrictions');
    } else if (predictedDensity > 0.7) {
      recommendations.push('Monitor closely and prepare diversion routes');
      recommendations.push('Alert nearby security teams');
    }

    if (predictedCongestion > 0.8) {
      recommendations.push('Clear potential bottlenecks');
      recommendations.push('Improve crowd flow signage');
    }

    return recommendations;
  }

  storeFrameHistory(cameraId, mat, metrics) {
    if (!this.frameHistory.has(cameraId)) {
      this.frameHistory.set(cameraId, []);
    }

    const history = this.frameHistory.get(cameraId);
    history.push({
      timestamp: new Date(),
      mat: mat.clone(),
      metrics,
      people: metrics.people || []
    });

    // Keep only last 20 frames
    if (history.length > 20) {
      history.shift();
    }
  }

  getPreviousFrame(cameraId) {
    const history = this.frameHistory.get(cameraId);
    return history && history.length > 1 ? history[history.length - 2] : null;
  }

  getRecentHistory(cameraId, count = 10) {
    const history = this.frameHistory.get(cameraId) || [];
    return history.slice(-count).map(frame => frame.metrics);
  }

  getContourCenter(contour) {
    const moments = contour.moments();
    return {
      x: moments.m10 / moments.m00,
      y: moments.m01 / moments.m00
    };
  }

  generateFallbackAnalysis(metadata) {
    return {
      currentMetrics: {
        density: 0.5,
        peopleCount: 0,
        velocity: 0,
        distribution: { uniformity: 1, hotspots: [] },
        patterns: { pattern: 'unknown', clusters: [] },
        congestionLevel: 0
      },
      motionAnalysis: { hasMotion: false, motionAreas: [] },
      predictions: {
        predictedDensity: 0.5,
        predictedCongestion: 0.5,
        confidence: 0.3,
        timeToAlert: null,
        recommendations: []
      },
      alerts: [],
      peopleCount: 0,
      timestamp: new Date(),
      cameraId: metadata.cameraId,
      fallbackMode: true
    };
  }
}

module.exports = LocalCrowdAnalytics;
