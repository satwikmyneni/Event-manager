/**
 * Real-Time Crowd Analytics Agent
 * Uses Vertex AI Vision + Forecasting for crowd density and movement prediction
 */

const { PredictionServiceClient } = require('@google-cloud/aiplatform');
const { ImageAnnotatorClient } = require('@google-cloud/vision');

class CrowdAnalyticsAgent {
  constructor() {
    this.visionClient = new ImageAnnotatorClient();
    this.predictionClient = new PredictionServiceClient();
    this.crowdHistory = [];
    this.alertThresholds = {
      density: 0.8, // 80% capacity
      velocity: 2.5, // m/s average movement
      congestion: 0.9 // 90% congestion level
    };
  }

  /**
   * Process video frame for crowd analysis
   * @param {Buffer} imageBuffer - Video frame as buffer
   * @param {Object} cameraMetadata - Camera location and specs
   */
  async analyzeFrame(imageBuffer, cameraMetadata) {
    try {
      // Detect people and objects in the frame
      const [result] = await this.visionClient.objectLocalization({
        image: { content: imageBuffer }
      });

      const people = result.localizedObjectAnnotations.filter(
        obj => obj.name === 'Person' && obj.score > 0.7
      );

      // Calculate crowd metrics
      const crowdMetrics = this.calculateCrowdMetrics(people, cameraMetadata);
      
      // Store historical data
      this.crowdHistory.push({
        timestamp: new Date(),
        cameraId: cameraMetadata.id,
        metrics: crowdMetrics,
        peopleCount: people.length
      });

      // Generate predictions
      const predictions = await this.generatePredictions(crowdMetrics);

      // Check for alerts
      const alerts = this.checkAlerts(crowdMetrics, predictions);

      return {
        currentMetrics: crowdMetrics,
        predictions,
        alerts,
        peopleCount: people.length,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Error analyzing frame:', error);
      throw error;
    }
  }

  /**
   * Calculate crowd density, velocity, and movement patterns
   */
  calculateCrowdMetrics(people, cameraMetadata) {
    const areaSize = cameraMetadata.coverageArea; // in square meters
    const density = people.length / areaSize;

    // Calculate movement vectors (simplified)
    const movements = people.map(person => {
      const center = this.getBoundingBoxCenter(person.boundingPoly);
      return {
        x: center.x,
        y: center.y,
        confidence: person.score
      };
    });

    // Estimate velocity based on position changes
    const velocity = this.estimateVelocity(movements, cameraMetadata.id);

    // Detect crowd patterns
    const patterns = this.detectCrowdPatterns(movements);

    return {
      density,
      velocity,
      patterns,
      distribution: this.calculateDistribution(movements),
      congestionLevel: this.calculateCongestion(density, velocity)
    };
  }

  /**
   * Generate 15-20 minute predictions using historical data
   */
  async generatePredictions(currentMetrics) {
    const historicalData = this.getRecentHistory(30); // Last 30 minutes
    
    if (historicalData.length < 10) {
      return { warning: 'Insufficient data for prediction' };
    }

    // Prepare time series data
    const timeSeriesData = historicalData.map(entry => ({
      timestamp: entry.timestamp,
      density: entry.metrics.density,
      velocity: entry.metrics.velocity,
      congestion: entry.metrics.congestionLevel
    }));

    try {
      // Use Vertex AI Forecasting (simplified implementation)
      const predictions = await this.callVertexAIForecasting(timeSeriesData);
      
      return {
        predictedDensity: predictions.density,
        predictedCongestion: predictions.congestion,
        riskLevel: this.calculateRiskLevel(predictions),
        timeToAlert: this.calculateTimeToAlert(predictions),
        recommendations: this.generateRecommendations(predictions)
      };

    } catch (error) {
      console.error('Prediction error:', error);
      return { error: 'Prediction service unavailable' };
    }
  }

  /**
   * Check for immediate alerts based on current metrics and predictions
   */
  checkAlerts(metrics, predictions) {
    const alerts = [];

    // Density alert
    if (metrics.density > this.alertThresholds.density) {
      alerts.push({
        type: 'HIGH_DENSITY',
        severity: 'WARNING',
        message: `Crowd density at ${(metrics.density * 100).toFixed(1)}% capacity`,
        location: metrics.location,
        timestamp: new Date()
      });
    }

    // Velocity alert (potential stampede)
    if (metrics.velocity > this.alertThresholds.velocity) {
      alerts.push({
        type: 'HIGH_VELOCITY',
        severity: 'CRITICAL',
        message: `Dangerous crowd movement detected: ${metrics.velocity.toFixed(1)} m/s`,
        location: metrics.location,
        timestamp: new Date()
      });
    }

    // Predictive alerts
    if (predictions.riskLevel === 'HIGH') {
      alerts.push({
        type: 'PREDICTIVE_RISK',
        severity: 'WARNING',
        message: `High risk of congestion predicted in ${predictions.timeToAlert} minutes`,
        location: metrics.location,
        timestamp: new Date(),
        recommendations: predictions.recommendations
      });
    }

    return alerts;
  }

  /**
   * Helper methods
   */
  getBoundingBoxCenter(boundingPoly) {
    const vertices = boundingPoly.normalizedVertices;
    const centerX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
    const centerY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;
    return { x: centerX, y: centerY };
  }

  estimateVelocity(currentMovements, cameraId) {
    const previousFrame = this.getPreviousFrame(cameraId);
    if (!previousFrame) return 0;

    // Calculate average movement between frames
    const movements = currentMovements.map((current, index) => {
      const previous = previousFrame.movements[index];
      if (!previous) return 0;
      
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      return Math.sqrt(dx * dx + dy * dy);
    });

    return movements.reduce((sum, v) => sum + v, 0) / movements.length;
  }

  detectCrowdPatterns(movements) {
    // Detect common crowd patterns: queuing, clustering, dispersing
    const clusters = this.findClusters(movements);
    const flowDirection = this.calculateFlowDirection(movements);
    
    return {
      clusters: clusters.length,
      primaryFlow: flowDirection,
      pattern: this.classifyPattern(clusters, flowDirection)
    };
  }

  calculateDistribution(movements) {
    // Calculate how evenly distributed the crowd is
    const gridSize = 10;
    const grid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
    
    movements.forEach(movement => {
      const gridX = Math.floor(movement.x * gridSize);
      const gridY = Math.floor(movement.y * gridSize);
      if (gridX < gridSize && gridY < gridSize) {
        grid[gridX][gridY]++;
      }
    });

    // Calculate distribution uniformity
    const totalPeople = movements.length;
    const expectedPerCell = totalPeople / (gridSize * gridSize);
    
    let variance = 0;
    grid.forEach(row => {
      row.forEach(count => {
        variance += Math.pow(count - expectedPerCell, 2);
      });
    });

    return {
      uniformity: 1 - (variance / (totalPeople * totalPeople)),
      hotspots: this.findHotspots(grid)
    };
  }

  calculateCongestion(density, velocity) {
    // Congestion increases with density and decreases with velocity
    const baseCongestion = density;
    const velocityFactor = Math.max(0, 1 - velocity / 3); // Normalize velocity
    return Math.min(1, baseCongestion * (1 + velocityFactor));
  }

  async callVertexAIForecasting(timeSeriesData) {
    // Simplified Vertex AI Forecasting call
    // In production, this would use the actual Vertex AI Forecasting API
    
    const trend = this.calculateTrend(timeSeriesData);
    const seasonality = this.detectSeasonality(timeSeriesData);
    
    return {
      density: this.extrapolateTrend(timeSeriesData.map(d => d.density), trend, 20),
      congestion: this.extrapolateTrend(timeSeriesData.map(d => d.congestion), trend, 20),
      confidence: 0.85
    };
  }

  calculateRiskLevel(predictions) {
    const maxDensity = Math.max(...predictions.density);
    const maxCongestion = Math.max(...predictions.congestion);
    
    if (maxDensity > 0.9 || maxCongestion > 0.9) return 'HIGH';
    if (maxDensity > 0.7 || maxCongestion > 0.7) return 'MEDIUM';
    return 'LOW';
  }

  calculateTimeToAlert(predictions) {
    // Find when density/congestion will exceed thresholds
    for (let i = 0; i < predictions.density.length; i++) {
      if (predictions.density[i] > this.alertThresholds.density ||
          predictions.congestion[i] > this.alertThresholds.congestion) {
        return i + 1; // minutes from now
      }
    }
    return null;
  }

  generateRecommendations(predictions) {
    const recommendations = [];
    
    if (predictions.riskLevel === 'HIGH') {
      recommendations.push('Implement crowd diversion immediately');
      recommendations.push('Deploy additional security personnel');
      recommendations.push('Activate emergency protocols');
    } else if (predictions.riskLevel === 'MEDIUM') {
      recommendations.push('Monitor closely and prepare diversion routes');
      recommendations.push('Alert nearby security teams');
    }

    return recommendations;
  }

  getRecentHistory(minutes) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.crowdHistory.filter(entry => entry.timestamp > cutoff);
  }

  getPreviousFrame(cameraId) {
    const cameraHistory = this.crowdHistory.filter(entry => entry.cameraId === cameraId);
    return cameraHistory[cameraHistory.length - 2]; // Second to last entry
  }

  // Additional helper methods would be implemented here...
  findClusters(movements) { return []; }
  calculateFlowDirection(movements) { return { angle: 0, strength: 0 }; }
  classifyPattern(clusters, flow) { return 'normal'; }
  findHotspots(grid) { return []; }
  calculateTrend(data) { return 0.1; }
  detectSeasonality(data) { return null; }
  extrapolateTrend(values, trend, steps) {
    return Array(steps).fill().map((_, i) => values[values.length - 1] + trend * (i + 1));
  }
}

module.exports = CrowdAnalyticsAgent;
