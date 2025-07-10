/**
 * Multimodal Anomaly Detection Agent
 * Uses Gemini Vision + traditional CV for threat detection
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ImageAnnotatorClient } = require('@google-cloud/vision');

class AnomalyDetectionAgent {
  constructor(geminiApiKey) {
    this.genAI = new GoogleGenerativeAI(geminiApiKey);
    this.visionModel = this.genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
    this.googleVision = new ImageAnnotatorClient();
    
    this.anomalyTypes = {
      CROWD_SURGE: { priority: 'CRITICAL', responseTime: 30 },
      PANIC_MOVEMENT: { priority: 'CRITICAL', responseTime: 30 },
      FIRE_SMOKE: { priority: 'CRITICAL', responseTime: 15 },
      WEAPON_DETECTION: { priority: 'CRITICAL', responseTime: 10 },
      SUSPICIOUS_BEHAVIOR: { priority: 'HIGH', responseTime: 60 },
      UNAUTHORIZED_ACCESS: { priority: 'HIGH', responseTime: 45 },
      MEDICAL_EMERGENCY: { priority: 'HIGH', responseTime: 120 },
      STRUCTURAL_DAMAGE: { priority: 'MEDIUM', responseTime: 300 }
    };

    this.detectionHistory = [];
    this.activeAlerts = new Map();
  }

  /**
   * Analyze video frame for anomalies using multimodal approach
   * @param {Buffer} imageBuffer - Video frame
   * @param {Object} frameMetadata - Camera info, timestamp, etc.
   */
  async analyzeFrame(imageBuffer, frameMetadata) {
    try {
      const analysisResults = await Promise.all([
        this.geminiVisionAnalysis(imageBuffer, frameMetadata),
        this.traditionalCVAnalysis(imageBuffer, frameMetadata),
        this.motionAnalysis(imageBuffer, frameMetadata)
      ]);

      const [geminiResults, cvResults, motionResults] = analysisResults;

      // Fuse results from different detection methods
      const fusedResults = this.fuseDetectionResults(geminiResults, cvResults, motionResults);

      // Generate alerts for detected anomalies
      const alerts = await this.generateAnomalyAlerts(fusedResults, frameMetadata);

      // Store detection history
      this.storeDetectionHistory(fusedResults, frameMetadata);

      return {
        detections: fusedResults,
        alerts,
        confidence: this.calculateOverallConfidence(fusedResults),
        timestamp: new Date(),
        cameraId: frameMetadata.cameraId
      };

    } catch (error) {
      console.error('Error in anomaly detection:', error);
      throw error;
    }
  }

  /**
   * Use Gemini Vision for contextual anomaly detection
   */
  async geminiVisionAnalysis(imageBuffer, metadata) {
    const prompt = `You are an AI security analyst monitoring a public event. Analyze this image for potential safety threats and anomalies.

    Look for:
    1. Crowd surge or dangerous crowd movements
    2. Panic behavior or distressed individuals
    3. Fire, smoke, or hazardous materials
    4. Weapons or dangerous objects
    5. Suspicious or threatening behavior
    6. Medical emergencies or people in distress
    7. Unauthorized access to restricted areas
    8. Structural damage or safety hazards

    For each detection, provide:
    - Type of anomaly
    - Confidence level (0-1)
    - Location in image (describe position)
    - Severity assessment
    - Recommended immediate action

    Respond in JSON format with structured data.`;

    try {
      const result = await this.visionModel.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBuffer.toString('base64')
          }
        }
      ]);

      const response = result.response.text();
      return this.parseGeminiDetectionResponse(response, metadata);

    } catch (error) {
      console.error('Gemini vision analysis error:', error);
      return { detections: [], error: error.message };
    }
  }

  /**
   * Traditional computer vision analysis using Google Cloud Vision
   */
  async traditionalCVAnalysis(imageBuffer, metadata) {
    try {
      const [objectResult] = await this.googleVision.objectLocalization({
        image: { content: imageBuffer }
      });

      const [labelResult] = await this.googleVision.labelDetection({
        image: { content: imageBuffer }
      });

      const [safeSearchResult] = await this.googleVision.safeSearchDetection({
        image: { content: imageBuffer }
      });

      return this.processCVResults(objectResult, labelResult, safeSearchResult, metadata);

    } catch (error) {
      console.error('Traditional CV analysis error:', error);
      return { detections: [], error: error.message };
    }
  }

  /**
   * Motion analysis for crowd dynamics
   */
  async motionAnalysis(imageBuffer, metadata) {
    // Get previous frame for motion comparison
    const previousFrame = this.getPreviousFrame(metadata.cameraId);
    if (!previousFrame) {
      return { detections: [], message: 'No previous frame for motion analysis' };
    }

    try {
      // Simplified motion detection - in production would use optical flow
      const motionVectors = await this.calculateMotionVectors(imageBuffer, previousFrame);
      const crowdDynamics = this.analyzeCrowdDynamics(motionVectors);

      return {
        detections: this.detectMotionAnomalies(crowdDynamics),
        motionVectors,
        crowdDynamics
      };

    } catch (error) {
      console.error('Motion analysis error:', error);
      return { detections: [], error: error.message };
    }
  }

  /**
   * Fuse results from different detection methods
   */
  fuseDetectionResults(geminiResults, cvResults, motionResults) {
    const allDetections = [
      ...(geminiResults.detections || []),
      ...(cvResults.detections || []),
      ...(motionResults.detections || [])
    ];

    // Group similar detections and increase confidence
    const fusedDetections = this.groupSimilarDetections(allDetections);

    // Apply confidence boosting for multi-method detections
    return fusedDetections.map(detection => ({
      ...detection,
      confidence: this.boostConfidenceForMultiMethod(detection),
      sources: detection.sources || ['gemini']
    }));
  }

  /**
   * Generate alerts for detected anomalies
   */
  async generateAnomalyAlerts(detections, metadata) {
    const alerts = [];

    for (const detection of detections) {
      if (detection.confidence > 0.7 && this.anomalyTypes[detection.type]) {
        const alert = {
          id: this.generateAlertId(),
          type: detection.type,
          severity: this.anomalyTypes[detection.type].priority,
          confidence: detection.confidence,
          location: {
            cameraId: metadata.cameraId,
            coordinates: metadata.coordinates,
            description: detection.location || metadata.location
          },
          description: detection.description,
          evidence: {
            snapshot: await this.createEvidenceSnapshot(detection, metadata),
            timestamp: new Date(),
            detectionSources: detection.sources
          },
          threatLevel: this.calculateThreatLevel(detection),
          recommendedActions: this.getRecommendedActions(detection.type),
          responseTimeRequired: this.anomalyTypes[detection.type].responseTime
        };

        // Check if this is a duplicate alert
        if (!this.isDuplicateAlert(alert)) {
          alerts.push(alert);
          this.activeAlerts.set(alert.id, alert);
        }
      }
    }

    return alerts;
  }

  /**
   * Parse Gemini detection response
   */
  parseGeminiDetectionResponse(response, metadata) {
    try {
      // Try to parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          detections: this.normalizeGeminiDetections(parsed),
          rawResponse: response
        };
      }

      // Fallback to text parsing
      return {
        detections: this.parseTextDetections(response),
        rawResponse: response
      };

    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      return {
        detections: this.parseTextDetections(response),
        error: error.message
      };
    }
  }

  /**
   * Process traditional CV results
   */
  processCVResults(objectResult, labelResult, safeSearchResult, metadata) {
    const detections = [];

    // Check for weapons in objects
    const objects = objectResult.localizedObjectAnnotations || [];
    objects.forEach(obj => {
      if (this.isWeaponObject(obj.name) && obj.score > 0.8) {
        detections.push({
          type: 'WEAPON_DETECTION',
          confidence: obj.score,
          location: this.boundingBoxToLocation(obj.boundingPoly),
          description: `Potential weapon detected: ${obj.name}`,
          sources: ['google_vision']
        });
      }
    });

    // Check labels for hazardous situations
    const labels = labelResult.labelAnnotations || [];
    labels.forEach(label => {
      if (this.isHazardousLabel(label.description) && label.score > 0.7) {
        detections.push({
          type: this.labelToAnomalyType(label.description),
          confidence: label.score,
          description: `Detected: ${label.description}`,
          sources: ['google_vision']
        });
      }
    });

    // Check safe search for violence indicators
    if (safeSearchResult.safeSearchAnnotation) {
      const violence = safeSearchResult.safeSearchAnnotation.violence;
      if (violence === 'LIKELY' || violence === 'VERY_LIKELY') {
        detections.push({
          type: 'SUSPICIOUS_BEHAVIOR',
          confidence: 0.8,
          description: 'Potential violence detected',
          sources: ['google_vision']
        });
      }
    }

    return { detections };
  }

  /**
   * Analyze crowd dynamics from motion vectors
   */
  analyzeCrowdDynamics(motionVectors) {
    if (!motionVectors || motionVectors.length === 0) {
      return { avgVelocity: 0, direction: null, coherence: 0 };
    }

    // Calculate average velocity
    const avgVelocity = motionVectors.reduce((sum, v) => sum + v.magnitude, 0) / motionVectors.length;

    // Calculate dominant direction
    const avgDirection = this.calculateAverageDirection(motionVectors);

    // Calculate motion coherence (how aligned the movements are)
    const coherence = this.calculateMotionCoherence(motionVectors, avgDirection);

    return {
      avgVelocity,
      direction: avgDirection,
      coherence,
      vectorCount: motionVectors.length
    };
  }

  /**
   * Detect motion-based anomalies
   */
  detectMotionAnomalies(crowdDynamics) {
    const detections = [];

    // High velocity could indicate panic or stampede
    if (crowdDynamics.avgVelocity > 3.0) {
      detections.push({
        type: 'PANIC_MOVEMENT',
        confidence: Math.min(0.95, crowdDynamics.avgVelocity / 5.0),
        description: `High crowd velocity detected: ${crowdDynamics.avgVelocity.toFixed(2)} m/s`,
        sources: ['motion_analysis']
      });
    }

    // High coherence with high velocity could indicate crowd surge
    if (crowdDynamics.coherence > 0.8 && crowdDynamics.avgVelocity > 2.0) {
      detections.push({
        type: 'CROWD_SURGE',
        confidence: crowdDynamics.coherence * 0.9,
        description: 'Coordinated crowd movement suggesting surge',
        sources: ['motion_analysis']
      });
    }

    // Very low coherence could indicate chaos or panic
    if (crowdDynamics.coherence < 0.2 && crowdDynamics.vectorCount > 50) {
      detections.push({
        type: 'PANIC_MOVEMENT',
        confidence: 0.7,
        description: 'Chaotic crowd movement patterns detected',
        sources: ['motion_analysis']
      });
    }

    return detections;
  }

  /**
   * Helper methods
   */
  groupSimilarDetections(detections) {
    const groups = new Map();
    
    detections.forEach(detection => {
      const key = `${detection.type}-${this.getLocationKey(detection.location)}`;
      if (groups.has(key)) {
        const existing = groups.get(key);
        existing.confidence = Math.max(existing.confidence, detection.confidence);
        existing.sources = [...new Set([...existing.sources, ...detection.sources])];
      } else {
        groups.set(key, { ...detection });
      }
    });

    return Array.from(groups.values());
  }

  boostConfidenceForMultiMethod(detection) {
    const sourceCount = detection.sources.length;
    let boostedConfidence = detection.confidence;

    // Boost confidence if detected by multiple methods
    if (sourceCount > 1) {
      boostedConfidence = Math.min(0.98, detection.confidence + (sourceCount - 1) * 0.1);
    }

    return boostedConfidence;
  }

  calculateThreatLevel(detection) {
    const baseLevel = detection.confidence;
    const typeMultiplier = this.getTypeMultiplier(detection.type);
    return Math.min(1.0, baseLevel * typeMultiplier);
  }

  getTypeMultiplier(type) {
    const multipliers = {
      'WEAPON_DETECTION': 1.5,
      'FIRE_SMOKE': 1.4,
      'CROWD_SURGE': 1.3,
      'PANIC_MOVEMENT': 1.2,
      'SUSPICIOUS_BEHAVIOR': 1.0,
      'MEDICAL_EMERGENCY': 1.1
    };
    return multipliers[type] || 1.0;
  }

  getRecommendedActions(anomalyType) {
    const actions = {
      'WEAPON_DETECTION': [
        'Immediately alert security personnel',
        'Isolate the area',
        'Contact law enforcement',
        'Activate lockdown procedures if necessary'
      ],
      'FIRE_SMOKE': [
        'Activate fire suppression systems',
        'Begin evacuation procedures',
        'Contact fire department',
        'Clear evacuation routes'
      ],
      'CROWD_SURGE': [
        'Deploy crowd control barriers',
        'Redirect crowd flow',
        'Increase security presence',
        'Monitor for escalation'
      ],
      'PANIC_MOVEMENT': [
        'Calm crowd through announcements',
        'Identify and address cause of panic',
        'Ensure clear evacuation routes',
        'Deploy medical teams'
      ]
    };

    return actions[anomalyType] || ['Alert security personnel', 'Monitor situation closely'];
  }

  async createEvidenceSnapshot(detection, metadata) {
    return {
      cameraId: metadata.cameraId,
      timestamp: new Date(),
      detectionType: detection.type,
      confidence: detection.confidence,
      boundingBox: detection.boundingBox,
      description: detection.description
    };
  }

  isDuplicateAlert(newAlert) {
    const recentAlerts = Array.from(this.activeAlerts.values())
      .filter(alert => 
        alert.type === newAlert.type &&
        alert.location.cameraId === newAlert.location.cameraId &&
        (Date.now() - alert.evidence.timestamp.getTime()) < 60000 // Within 1 minute
      );

    return recentAlerts.length > 0;
  }

  generateAlertId() {
    return `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  storeDetectionHistory(detections, metadata) {
    this.detectionHistory.push({
      timestamp: new Date(),
      cameraId: metadata.cameraId,
      detections,
      frameMetadata: metadata
    });

    // Keep only last 1000 entries
    if (this.detectionHistory.length > 1000) {
      this.detectionHistory = this.detectionHistory.slice(-1000);
    }
  }

  calculateOverallConfidence(detections) {
    if (detections.length === 0) return 0;
    
    const avgConfidence = detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length;
    const maxConfidence = Math.max(...detections.map(d => d.confidence));
    
    // Weight average and max confidence
    return (avgConfidence * 0.6) + (maxConfidence * 0.4);
  }

  getPreviousFrame(cameraId) {
    const cameraHistory = this.detectionHistory
      .filter(entry => entry.cameraId === cameraId)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return cameraHistory[1]; // Second most recent (previous frame)
  }

  async calculateMotionVectors(currentFrame, previousFrame) {
    // Simplified motion vector calculation
    // In production, would use optical flow algorithms
    return [
      { x: 10, y: 5, magnitude: Math.sqrt(125), angle: Math.atan2(5, 10) },
      { x: -5, y: 8, magnitude: Math.sqrt(89), angle: Math.atan2(8, -5) }
    ];
  }

  calculateAverageDirection(vectors) {
    const avgX = vectors.reduce((sum, v) => sum + Math.cos(v.angle), 0) / vectors.length;
    const avgY = vectors.reduce((sum, v) => sum + Math.sin(v.angle), 0) / vectors.length;
    return Math.atan2(avgY, avgX);
  }

  calculateMotionCoherence(vectors, avgDirection) {
    const coherenceValues = vectors.map(v => Math.cos(v.angle - avgDirection));
    return coherenceValues.reduce((sum, c) => sum + c, 0) / coherenceValues.length;
  }

  isWeaponObject(objectName) {
    const weaponKeywords = ['gun', 'knife', 'weapon', 'pistol', 'rifle', 'blade'];
    return weaponKeywords.some(keyword => objectName.toLowerCase().includes(keyword));
  }

  isHazardousLabel(label) {
    const hazardKeywords = ['fire', 'smoke', 'explosion', 'violence', 'fight', 'panic'];
    return hazardKeywords.some(keyword => label.toLowerCase().includes(keyword));
  }

  labelToAnomalyType(label) {
    const mapping = {
      'fire': 'FIRE_SMOKE',
      'smoke': 'FIRE_SMOKE',
      'violence': 'SUSPICIOUS_BEHAVIOR',
      'fight': 'SUSPICIOUS_BEHAVIOR',
      'panic': 'PANIC_MOVEMENT'
    };

    for (const [keyword, type] of Object.entries(mapping)) {
      if (label.toLowerCase().includes(keyword)) {
        return type;
      }
    }

    return 'SUSPICIOUS_BEHAVIOR';
  }

  boundingBoxToLocation(boundingPoly) {
    if (!boundingPoly || !boundingPoly.normalizedVertices) return null;
    
    const vertices = boundingPoly.normalizedVertices;
    const centerX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
    const centerY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;
    
    return { x: centerX, y: centerY };
  }

  getLocationKey(location) {
    if (!location) return 'unknown';
    if (typeof location === 'string') return location;
    if (location.x !== undefined && location.y !== undefined) {
      return `${Math.round(location.x * 10)}-${Math.round(location.y * 10)}`;
    }
    return 'unknown';
  }

  normalizeGeminiDetections(parsed) {
    // Normalize Gemini response format to standard detection format
    if (Array.isArray(parsed)) return parsed;
    if (parsed.detections) return parsed.detections;
    if (parsed.anomalies) return parsed.anomalies;
    return [];
  }

  parseTextDetections(text) {
    // Simple text parsing for non-JSON responses
    const detections = [];
    const lines = text.split('\n');
    
    lines.forEach(line => {
      if (line.toLowerCase().includes('detected') || line.toLowerCase().includes('found')) {
        detections.push({
          type: 'SUSPICIOUS_BEHAVIOR',
          confidence: 0.6,
          description: line.trim(),
          sources: ['gemini_text']
        });
      }
    });

    return detections;
  }
}

module.exports = AnomalyDetectionAgent;
