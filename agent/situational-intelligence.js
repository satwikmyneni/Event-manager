/**
 * Gemini-Driven Situational Intelligence Agent
 * Generates natural language summaries from multi-source data
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

class SituationalIntelligenceAgent {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    this.visionModel = this.genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
    this.dataStore = new Map(); // In-memory store for demo
  }

  /**
   * Generate situational summary based on query
   * @param {string} query - Natural language query
   * @param {Object} context - Additional context (location, time range, etc.)
   */
  async generateSummary(query, context = {}) {
    try {
      // Gather relevant data based on query
      const relevantData = await this.gatherRelevantData(query, context);
      
      // Create comprehensive prompt for Gemini
      const prompt = this.buildSummaryPrompt(query, relevantData, context);
      
      // Generate summary using Gemini
      const result = await this.model.generateContent(prompt);
      const summary = result.response.text();
      
      // Parse and structure the response
      const structuredSummary = this.parseGeminiResponse(summary, relevantData);
      
      return {
        query,
        summary: structuredSummary,
        timestamp: new Date(),
        dataSourcesUsed: relevantData.sources,
        confidence: this.calculateConfidence(relevantData),
        visualMarkers: this.generateMapMarkers(structuredSummary, context)
      };

    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  }

  /**
   * Process multimodal data (text, images, sensor data)
   * @param {Array} dataInputs - Mixed data types
   */
  async processMultimodalData(dataInputs) {
    const processedData = {
      textData: [],
      imageAnalysis: [],
      sensorData: [],
      socialMedia: [],
      alerts: []
    };

    for (const input of dataInputs) {
      switch (input.type) {
        case 'text':
          processedData.textData.push(await this.processTextData(input));
          break;
        case 'image':
          processedData.imageAnalysis.push(await this.processImageData(input));
          break;
        case 'sensor':
          processedData.sensorData.push(this.processSensorData(input));
          break;
        case 'social':
          processedData.socialMedia.push(await this.processSocialMediaData(input));
          break;
        case 'alert':
          processedData.alerts.push(this.processAlertData(input));
          break;
      }
    }

    return processedData;
  }

  /**
   * Analyze images using Gemini Vision
   */
  async processImageData(imageInput) {
    try {
      const prompt = `Analyze this image from a public safety perspective. Identify:
      1. Crowd density and behavior
      2. Any safety hazards or concerns
      3. Notable events or incidents
      4. Overall situation assessment
      
      Provide a structured analysis with specific details and confidence levels.`;

      const result = await this.visionModel.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: imageInput.mimeType,
            data: imageInput.data
          }
        }
      ]);

      const analysis = result.response.text();
      
      return {
        timestamp: imageInput.timestamp,
        location: imageInput.location,
        cameraId: imageInput.cameraId,
        analysis: this.parseImageAnalysis(analysis),
        rawResponse: analysis
      };

    } catch (error) {
      console.error('Error processing image:', error);
      return { error: error.message };
    }
  }

  /**
   * Build comprehensive prompt for situational summary
   */
  buildSummaryPrompt(query, data, context) {
    const timeRange = context.timeRange || 'last 30 minutes';
    const location = context.location || 'event area';
    
    return `You are an AI situational awareness analyst for a large public event. 
    
    QUERY: "${query}"
    LOCATION: ${location}
    TIME RANGE: ${timeRange}
    
    AVAILABLE DATA:
    
    CROWD ANALYTICS:
    ${JSON.stringify(data.crowdData, null, 2)}
    
    SECURITY ALERTS:
    ${JSON.stringify(data.alerts, null, 2)}
    
    SENSOR DATA:
    ${JSON.stringify(data.sensorData, null, 2)}
    
    SOCIAL MEDIA MENTIONS:
    ${JSON.stringify(data.socialMedia, null, 2)}
    
    EMERGENCY REPORTS:
    ${JSON.stringify(data.emergencyReports, null, 2)}
    
    Please provide a comprehensive situational summary that includes:
    
    1. CRITICAL EVENTS: List the most important incidents or situations
    2. PROBABLE CAUSES: Analysis of what led to these events
    3. CURRENT STATUS: Real-time assessment of the situation
    4. RISK ASSESSMENT: Potential future risks and their likelihood
    5. SUGGESTED ACTIONS: Specific, actionable recommendations
    6. RESOURCE ALLOCATION: Where to deploy personnel/resources
    7. TIMELINE: Sequence of events and predicted developments
    
    Format your response as structured JSON with clear sections.
    Be specific, actionable, and prioritize public safety.`;
  }

  /**
   * Gather relevant data based on query and context
   */
  async gatherRelevantData(query, context) {
    const data = {
      crowdData: [],
      alerts: [],
      sensorData: [],
      socialMedia: [],
      emergencyReports: [],
      sources: []
    };

    // Extract location and time filters from query
    const filters = this.extractFilters(query, context);
    
    // Gather crowd analytics data
    if (this.shouldIncludeCrowdData(query)) {
      data.crowdData = await this.getCrowdData(filters);
      data.sources.push('crowd_analytics');
    }

    // Gather security alerts
    if (this.shouldIncludeAlerts(query)) {
      data.alerts = await this.getAlerts(filters);
      data.sources.push('security_alerts');
    }

    // Gather sensor data
    if (this.shouldIncludeSensorData(query)) {
      data.sensorData = await this.getSensorData(filters);
      data.sources.push('sensor_network');
    }

    // Gather social media data
    if (this.shouldIncludeSocialMedia(query)) {
      data.socialMedia = await this.getSocialMediaData(filters);
      data.sources.push('social_media');
    }

    // Gather emergency reports
    if (this.shouldIncludeEmergencyReports(query)) {
      data.emergencyReports = await this.getEmergencyReports(filters);
      data.sources.push('emergency_reports');
    }

    return data;
  }

  /**
   * Parse Gemini response into structured format
   */
  parseGeminiResponse(response, data) {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback to text parsing
      return this.parseTextResponse(response);
      
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      return {
        summary: response,
        parsed: false,
        error: error.message
      };
    }
  }

  /**
   * Parse text response into structured format
   */
  parseTextResponse(text) {
    const sections = {
      criticalEvents: [],
      probableCauses: [],
      currentStatus: '',
      riskAssessment: '',
      suggestedActions: [],
      resourceAllocation: [],
      timeline: []
    };

    // Extract sections using regex patterns
    const criticalEventsMatch = text.match(/CRITICAL EVENTS?:?\s*([\s\S]*?)(?=PROBABLE CAUSES?|$)/i);
    if (criticalEventsMatch) {
      sections.criticalEvents = this.extractListItems(criticalEventsMatch[1]);
    }

    const causesMatch = text.match(/PROBABLE CAUSES?:?\s*([\s\S]*?)(?=CURRENT STATUS|$)/i);
    if (causesMatch) {
      sections.probableCauses = this.extractListItems(causesMatch[1]);
    }

    const statusMatch = text.match(/CURRENT STATUS:?\s*([\s\S]*?)(?=RISK ASSESSMENT|$)/i);
    if (statusMatch) {
      sections.currentStatus = statusMatch[1].trim();
    }

    const actionsMatch = text.match(/SUGGESTED ACTIONS?:?\s*([\s\S]*?)(?=RESOURCE ALLOCATION|$)/i);
    if (actionsMatch) {
      sections.suggestedActions = this.extractListItems(actionsMatch[1]);
    }

    return sections;
  }

  /**
   * Generate map markers based on summary content
   */
  generateMapMarkers(summary, context) {
    const markers = [];
    
    // Extract locations mentioned in critical events
    if (summary.criticalEvents) {
      summary.criticalEvents.forEach((event, index) => {
        const location = this.extractLocationFromText(event);
        if (location) {
          markers.push({
            id: `critical-${index}`,
            type: 'critical',
            location: location,
            title: 'Critical Event',
            description: event,
            severity: 'high'
          });
        }
      });
    }

    // Add suggested action locations
    if (summary.suggestedActions) {
      summary.suggestedActions.forEach((action, index) => {
        const location = this.extractLocationFromText(action);
        if (location) {
          markers.push({
            id: `action-${index}`,
            type: 'action',
            location: location,
            title: 'Suggested Action',
            description: action,
            severity: 'medium'
          });
        }
      });
    }

    return markers;
  }

  /**
   * Helper methods for data gathering
   */
  async getCrowdData(filters) {
    // Mock implementation - would connect to actual crowd analytics service
    return [
      {
        location: 'Main Stage',
        density: 0.85,
        velocity: 1.2,
        timestamp: new Date(),
        alert: 'High density detected'
      }
    ];
  }

  async getAlerts(filters) {
    // Mock implementation - would connect to alert system
    return [
      {
        type: 'SECURITY',
        severity: 'HIGH',
        location: 'West Gate',
        message: 'Suspicious activity reported',
        timestamp: new Date()
      }
    ];
  }

  async getSensorData(filters) {
    // Mock implementation - would connect to sensor network
    return [
      {
        sensorId: 'temp-01',
        type: 'temperature',
        value: 32,
        location: 'Food Court',
        timestamp: new Date()
      }
    ];
  }

  async getSocialMediaData(filters) {
    // Mock implementation - would connect to social media APIs
    return [
      {
        platform: 'twitter',
        content: 'Long lines at the west entrance #event',
        sentiment: 'negative',
        location: 'West Gate',
        timestamp: new Date()
      }
    ];
  }

  async getEmergencyReports(filters) {
    // Mock implementation - would connect to emergency system
    return [
      {
        type: 'MEDICAL',
        severity: 'MEDIUM',
        location: 'Section B',
        description: 'Person feeling unwell',
        timestamp: new Date()
      }
    ];
  }

  /**
   * Utility methods
   */
  extractFilters(query, context) {
    return {
      location: context.location || this.extractLocationFromText(query),
      timeRange: context.timeRange || this.extractTimeFromText(query),
      severity: this.extractSeverityFromText(query)
    };
  }

  shouldIncludeCrowdData(query) {
    const crowdKeywords = ['crowd', 'density', 'people', 'congestion', 'flow'];
    return crowdKeywords.some(keyword => query.toLowerCase().includes(keyword));
  }

  shouldIncludeAlerts(query) {
    const alertKeywords = ['alert', 'security', 'incident', 'emergency', 'safety'];
    return alertKeywords.some(keyword => query.toLowerCase().includes(keyword));
  }

  shouldIncludeSensorData(query) {
    const sensorKeywords = ['temperature', 'noise', 'air quality', 'sensor'];
    return sensorKeywords.some(keyword => query.toLowerCase().includes(keyword));
  }

  shouldIncludeSocialMedia(query) {
    const socialKeywords = ['social', 'twitter', 'facebook', 'sentiment', 'mentions'];
    return socialKeywords.some(keyword => query.toLowerCase().includes(keyword));
  }

  shouldIncludeEmergencyReports(query) {
    const emergencyKeywords = ['emergency', 'medical', 'fire', 'evacuation'];
    return emergencyKeywords.some(keyword => query.toLowerCase().includes(keyword));
  }

  extractListItems(text) {
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./)))
      .map(line => line.replace(/^[-•\d.]\s*/, ''));
  }

  extractLocationFromText(text) {
    // Simple location extraction - would use NLP in production
    const locationPatterns = [
      /(?:at|near|in)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/g,
      /([A-Z][a-z]+\s+(?:Gate|Stage|Area|Section|Court))/g
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  extractTimeFromText(text) {
    const timePatterns = [
      /last\s+(\d+)\s+(minutes?|hours?)/i,
      /past\s+(\d+)\s+(minutes?|hours?)/i
    ];
    
    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) return `${match[1]} ${match[2]}`;
    }
    return 'last 30 minutes';
  }

  extractSeverityFromText(text) {
    if (text.toLowerCase().includes('critical') || text.toLowerCase().includes('emergency')) {
      return 'critical';
    } else if (text.toLowerCase().includes('high') || text.toLowerCase().includes('urgent')) {
      return 'high';
    } else if (text.toLowerCase().includes('medium') || text.toLowerCase().includes('moderate')) {
      return 'medium';
    }
    return 'low';
  }

  calculateConfidence(data) {
    const sourceCount = data.sources.length;
    const dataPoints = Object.values(data).reduce((sum, arr) => 
      Array.isArray(arr) ? sum + arr.length : sum, 0);
    
    // Simple confidence calculation based on data availability
    return Math.min(0.95, 0.3 + (sourceCount * 0.15) + (dataPoints * 0.02));
  }

  parseImageAnalysis(analysis) {
    // Parse structured image analysis from Gemini Vision
    return {
      crowdDensity: this.extractMetricFromText(analysis, 'crowd density'),
      safetyHazards: this.extractListFromText(analysis, 'safety hazards'),
      incidents: this.extractListFromText(analysis, 'incidents'),
      overallAssessment: this.extractAssessmentFromText(analysis)
    };
  }

  extractMetricFromText(text, metric) {
    const pattern = new RegExp(`${metric}:?\\s*([^\\n]+)`, 'i');
    const match = text.match(pattern);
    return match ? match[1].trim() : null;
  }

  extractListFromText(text, listType) {
    const pattern = new RegExp(`${listType}:?\\s*([\\s\\S]*?)(?=\\n\\n|$)`, 'i');
    const match = text.match(pattern);
    if (match) {
      return match[1].split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    }
    return [];
  }

  extractAssessmentFromText(text) {
    const assessmentPattern = /overall.*?assessment:?\s*([^\n]+)/i;
    const match = text.match(assessmentPattern);
    return match ? match[1].trim() : 'No assessment available';
  }
}

module.exports = SituationalIntelligenceAgent;
