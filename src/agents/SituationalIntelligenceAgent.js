/**
 * Situational Intelligence Agent
 * Uses Gemini Pro for natural language situational summaries
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getFirestore } = require('firebase-admin/firestore');

class SituationalIntelligenceAgent {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    this.db = getFirestore();
  }

  /**
   * Process natural language situational queries
   * Example: "Summarize security concerns in the West Zone"
   */
  async processSituationalQuery(query, context = {}) {
    try {
      console.log(`Processing situational query: "${query}"`);
      
      // Step 1: Parse query intent and extract parameters
      const queryAnalysis = await this.analyzeQueryIntent(query);
      
      // Step 2: Gather relevant intelligence data
      const intelligenceData = await this.gatherIntelligenceData(queryAnalysis, context);
      
      // Step 3: Generate comprehensive situational summary using Gemini
      const situationalSummary = await this.generateSituationalSummary(
        query, 
        intelligenceData, 
        context
      );
      
      // Step 4: Create actionable intelligence briefing
      const actionableBriefing = this.createActionableBriefing(situationalSummary, intelligenceData);
      
      // Step 5: Store query and response for learning
      await this.storeSituationalQuery(query, actionableBriefing, context);
      
      return {
        query,
        timestamp: new Date(),
        briefing: actionableBriefing,
        dataSourcesUsed: intelligenceData.sources,
        confidence: actionableBriefing.confidence,
        processingTime: Date.now() - Date.now() // Will be calculated properly
      };

    } catch (error) {
      console.error('Error processing situational query:', error);
      throw error;
    }
  }

  /**
   * Analyze query intent using Gemini
   */
  async analyzeQueryIntent(query) {
    const intentPrompt = `
    Analyze this situational awareness query and extract key parameters:
    
    QUERY: "${query}"
    
    Extract and return in JSON format:
    {
      "intent": "summary|status|threat_assessment|resource_allocation|prediction",
      "location": "specific area mentioned or null",
      "timeframe": "time period mentioned or 'current'",
      "priority": "critical|high|medium|low",
      "focus_areas": ["security", "crowd", "medical", "infrastructure", etc.],
      "response_type": "brief|detailed|tactical"
    }
    
    Be precise and specific in your analysis.
    `;

    const result = await this.model.generateContent(intentPrompt);
    const response = result.response.text();
    
    try {
      return JSON.parse(response);
    } catch (parseError) {
      // Fallback parsing if JSON is malformed
      return this.parseIntentFallback(query, response);
    }
  }

  /**
   * Gather multi-source intelligence data
   */
  async gatherIntelligenceData(queryAnalysis, context) {
    const timeWindow = this.parseTimeWindow(queryAnalysis.timeframe);
    const location = queryAnalysis.location || context.zone;
    
    console.log(`Gathering intelligence for ${location} over ${timeWindow} minutes`);
    
    const intelligenceData = {
      sources: [],
      videoAnalytics: [],
      securityReports: [],
      socialMediaData: [],
      crowdMetrics: [],
      emergencyReports: [],
      sensorData: [],
      weatherData: null
    };

    // Gather video analytics data
    if (queryAnalysis.focus_areas.includes('crowd') || queryAnalysis.focus_areas.includes('security')) {
      intelligenceData.videoAnalytics = await this.getVideoAnalytics(location, timeWindow);
      intelligenceData.sources.push('video_analytics');
    }

    // Gather security reports
    if (queryAnalysis.focus_areas.includes('security')) {
      intelligenceData.securityReports = await this.getSecurityReports(location, timeWindow);
      intelligenceData.sources.push('security_reports');
    }

    // Gather social media sentiment
    if (queryAnalysis.intent === 'summary' || queryAnalysis.focus_areas.includes('crowd')) {
      intelligenceData.socialMediaData = await this.getSocialMediaData(location, timeWindow);
      intelligenceData.sources.push('social_media');
    }

    // Gather crowd metrics
    if (queryAnalysis.focus_areas.includes('crowd')) {
      intelligenceData.crowdMetrics = await this.getCrowdMetrics(location, timeWindow);
      intelligenceData.sources.push('crowd_metrics');
    }

    // Gather emergency reports
    if (queryAnalysis.focus_areas.includes('medical') || queryAnalysis.priority === 'critical') {
      intelligenceData.emergencyReports = await this.getEmergencyReports(location, timeWindow);
      intelligenceData.sources.push('emergency_reports');
    }

    // Gather sensor data
    if (queryAnalysis.focus_areas.includes('infrastructure')) {
      intelligenceData.sensorData = await this.getSensorData(location, timeWindow);
      intelligenceData.sources.push('sensor_data');
    }

    // Get weather data if relevant
    if (queryAnalysis.focus_areas.includes('weather') || context.includeWeather) {
      intelligenceData.weatherData = await this.getWeatherData(location);
      intelligenceData.sources.push('weather_data');
    }

    return intelligenceData;
  }

  /**
   * Generate comprehensive situational summary using Gemini Pro
   */
  async generateSituationalSummary(query, intelligenceData, context) {
    const summaryPrompt = this.buildComprehensiveSummaryPrompt(query, intelligenceData, context);
    
    const result = await this.model.generateContent(summaryPrompt);
    const summaryText = result.response.text();
    
    // Parse the structured response
    return this.parseSituationalSummary(summaryText, intelligenceData);
  }

  /**
   * Build comprehensive summary prompt for Gemini
   */
  buildComprehensiveSummaryPrompt(query, data, context) {
    const location = context.zone || 'event area';
    const timeframe = context.timeWindow || 'current situation';
    
    return `
    You are an AI situational awareness commander for a large-scale public event. 
    Provide a comprehensive tactical briefing based on the query and available intelligence.
    
    COMMANDER QUERY: "${query}"
    AREA OF INTEREST: ${location}
    TIME FRAME: ${timeframe}
    
    AVAILABLE INTELLIGENCE:
    
    VIDEO ANALYTICS (${data.videoAnalytics.length} reports):
    ${this.formatVideoAnalytics(data.videoAnalytics)}
    
    SECURITY REPORTS (${data.securityReports.length} reports):
    ${this.formatSecurityReports(data.securityReports)}
    
    CROWD METRICS:
    ${this.formatCrowdMetrics(data.crowdMetrics)}
    
    SOCIAL MEDIA SENTIMENT:
    ${this.formatSocialMediaData(data.socialMediaData)}
    
    EMERGENCY REPORTS (${data.emergencyReports.length} active):
    ${this.formatEmergencyReports(data.emergencyReports)}
    
    SENSOR DATA:
    ${this.formatSensorData(data.sensorData)}
    
    ${data.weatherData ? `WEATHER CONDITIONS: ${JSON.stringify(data.weatherData)}` : ''}
    
    PROVIDE A STRUCTURED TACTICAL BRIEFING:
    
    ## CRITICAL THREATS
    List immediate threats requiring urgent attention with specific locations and severity levels.
    
    ## CROWD STATUS  
    Current crowd density, flow patterns, and any concerning behaviors or bottlenecks.
    
    ## PREDICTED RISKS
    Potential issues likely to develop in the next 15-20 minutes based on current trends.
    
    ## RECOMMENDED ACTIONS
    Specific, actionable recommendations with priority levels and resource requirements.
    
    ## RESOURCE ALLOCATION
    Optimal positioning of security, medical, and support personnel based on current intelligence.
    
    ## TACTICAL PRIORITIES
    Top 3 priorities for command attention in order of urgency.
    
    ## SITUATIONAL CONFIDENCE
    Your confidence level in this assessment (0-100%) and any intelligence gaps.
    
    Be concise, specific, and focus on actionable intelligence that enables proactive decision-making.
    Use military-style brevity and precision in your language.
    `;
  }

  /**
   * Parse Gemini's situational summary response
   */
  parseSituationalSummary(summaryText, intelligenceData) {
    const sections = {
      criticalThreats: [],
      crowdStatus: '',
      predictedRisks: [],
      recommendedActions: [],
      resourceAllocation: [],
      tacticalPriorities: [],
      confidence: 0.8
    };

    try {
      // Extract sections using regex patterns
      const criticalThreatsMatch = summaryText.match(/## CRITICAL THREATS\s*([\s\S]*?)(?=##|$)/i);
      if (criticalThreatsMatch) {
        sections.criticalThreats = this.extractListItems(criticalThreatsMatch[1]);
      }

      const crowdStatusMatch = summaryText.match(/## CROWD STATUS\s*([\s\S]*?)(?=##|$)/i);
      if (crowdStatusMatch) {
        sections.crowdStatus = crowdStatusMatch[1].trim();
      }

      const predictedRisksMatch = summaryText.match(/## PREDICTED RISKS\s*([\s\S]*?)(?=##|$)/i);
      if (predictedRisksMatch) {
        sections.predictedRisks = this.extractListItems(predictedRisksMatch[1]);
      }

      const recommendedActionsMatch = summaryText.match(/## RECOMMENDED ACTIONS\s*([\s\S]*?)(?=##|$)/i);
      if (recommendedActionsMatch) {
        sections.recommendedActions = this.extractActionItems(recommendedActionsMatch[1]);
      }

      const resourceAllocationMatch = summaryText.match(/## RESOURCE ALLOCATION\s*([\s\S]*?)(?=##|$)/i);
      if (resourceAllocationMatch) {
        sections.resourceAllocation = this.extractResourceItems(resourceAllocationMatch[1]);
      }

      const tacticalPrioritiesMatch = summaryText.match(/## TACTICAL PRIORITIES\s*([\s\S]*?)(?=##|$)/i);
      if (tacticalPrioritiesMatch) {
        sections.tacticalPriorities = this.extractPriorityItems(tacticalPrioritiesMatch[1]);
      }

      const confidenceMatch = summaryText.match(/## SITUATIONAL CONFIDENCE\s*([\s\S]*?)(?=##|$)/i);
      if (confidenceMatch) {
        const confidenceText = confidenceMatch[1];
        const percentMatch = confidenceText.match(/(\d+)%/);
        if (percentMatch) {
          sections.confidence = parseInt(percentMatch[1]) / 100;
        }
      }

    } catch (parseError) {
      console.error('Error parsing situational summary:', parseError);
      sections.rawSummary = summaryText;
      sections.parseError = parseError.message;
    }

    return sections;
  }

  /**
   * Create actionable intelligence briefing
   */
  createActionableBriefing(summary, intelligenceData) {
    return {
      executiveSummary: this.generateExecutiveSummary(summary),
      threatAssessment: {
        level: this.calculateThreatLevel(summary.criticalThreats),
        immediateThreats: summary.criticalThreats.slice(0, 3),
        emergingRisks: summary.predictedRisks
      },
      crowdIntelligence: {
        status: summary.crowdStatus,
        density: this.extractCrowdDensity(intelligenceData.crowdMetrics),
        sentiment: this.extractCrowdSentiment(intelligenceData.socialMediaData),
        flowPatterns: this.extractFlowPatterns(intelligenceData.videoAnalytics)
      },
      actionableRecommendations: this.prioritizeActions(summary.recommendedActions),
      resourceDeployment: this.optimizeResourceDeployment(summary.resourceAllocation),
      commandPriorities: summary.tacticalPriorities,
      confidence: summary.confidence,
      nextAssessment: this.calculateNextAssessmentTime(summary),
      alertLevel: this.calculateAlertLevel(summary)
    };
  }

  /**
   * Data gathering methods
   */
  async getVideoAnalytics(location, timeWindow) {
    const cutoff = new Date(Date.now() - timeWindow * 60 * 1000);
    
    const snapshot = await this.db.collection('video_analytics')
      .where('location', '==', location)
      .where('timestamp', '>', cutoff)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getSecurityReports(location, timeWindow) {
    const cutoff = new Date(Date.now() - timeWindow * 60 * 1000);
    
    const snapshot = await this.db.collection('security_reports')
      .where('location', '==', location)
      .where('timestamp', '>', cutoff)
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getSocialMediaData(location, timeWindow) {
    const cutoff = new Date(Date.now() - timeWindow * 60 * 1000);
    
    const snapshot = await this.db.collection('social_media_monitoring')
      .where('location', '==', location)
      .where('timestamp', '>', cutoff)
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getCrowdMetrics(location, timeWindow) {
    const cutoff = new Date(Date.now() - timeWindow * 60 * 1000);
    
    const snapshot = await this.db.collection('crowd_analytics')
      .where('location', '==', location)
      .where('timestamp', '>', cutoff)
      .orderBy('timestamp', 'desc')
      .limit(30)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getEmergencyReports(location, timeWindow) {
    const cutoff = new Date(Date.now() - timeWindow * 60 * 1000);
    
    const snapshot = await this.db.collection('emergencies')
      .where('location', '==', location)
      .where('timestamp', '>', cutoff)
      .where('status', 'in', ['active', 'responding'])
      .orderBy('timestamp', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getSensorData(location, timeWindow) {
    const cutoff = new Date(Date.now() - timeWindow * 60 * 1000);
    
    const snapshot = await this.db.collection('sensor_data')
      .where('location', '==', location)
      .where('timestamp', '>', cutoff)
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getWeatherData(location) {
    // Mock weather data - in production would integrate with weather API
    return {
      temperature: 22,
      humidity: 65,
      windSpeed: 12,
      conditions: 'partly_cloudy',
      visibility: 'good'
    };
  }

  /**
   * Data formatting methods for Gemini prompt
   */
  formatVideoAnalytics(analytics) {
    if (!analytics.length) return 'No video analytics data available';
    
    return analytics.slice(0, 10).map(item => 
      `- ${item.timestamp}: ${item.alert_type} at ${item.camera_location} (Confidence: ${item.confidence})`
    ).join('\n');
  }

  formatSecurityReports(reports) {
    if (!reports.length) return 'No security reports';
    
    return reports.slice(0, 5).map(report => 
      `- ${report.timestamp}: ${report.incident_type} - ${report.description} (Status: ${report.status})`
    ).join('\n');
  }

  formatCrowdMetrics(metrics) {
    if (!metrics.length) return 'No crowd metrics available';
    
    const latest = metrics[0];
    const avgDensity = metrics.reduce((sum, m) => sum + (m.density || 0), 0) / metrics.length;
    
    return `Current density: ${(latest.density * 100).toFixed(1)}%, Average: ${(avgDensity * 100).toFixed(1)}%, People count: ${latest.people_count || 0}`;
  }

  formatSocialMediaData(socialData) {
    if (!socialData.length) return 'No social media data';
    
    const sentiments = socialData.map(post => post.sentiment);
    const positive = sentiments.filter(s => s === 'positive').length;
    const negative = sentiments.filter(s => s === 'negative').length;
    const neutral = sentiments.filter(s => s === 'neutral').length;
    
    return `Posts analyzed: ${socialData.length}, Positive: ${positive}, Negative: ${negative}, Neutral: ${neutral}`;
  }

  formatEmergencyReports(emergencies) {
    if (!emergencies.length) return 'No active emergencies';
    
    return emergencies.map(emergency => 
      `- ${emergency.type}: ${emergency.description} at ${emergency.location} (Status: ${emergency.status})`
    ).join('\n');
  }

  formatSensorData(sensors) {
    if (!sensors.length) return 'No sensor data';
    
    return sensors.slice(0, 5).map(sensor => 
      `- ${sensor.sensor_type}: ${sensor.value} ${sensor.unit} at ${sensor.location}`
    ).join('\n');
  }

  /**
   * Helper methods
   */
  parseTimeWindow(timeframe) {
    if (timeframe === 'current') return 30; // 30 minutes default
    
    const hourMatch = timeframe.match(/(\d+)\s*hour/i);
    if (hourMatch) return parseInt(hourMatch[1]) * 60;
    
    const minuteMatch = timeframe.match(/(\d+)\s*minute/i);
    if (minuteMatch) return parseInt(minuteMatch[1]);
    
    return 30; // default
  }

  extractListItems(text) {
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./)))
      .map(line => line.replace(/^[-•\d.]\s*/, ''));
  }

  extractActionItems(text) {
    const items = this.extractListItems(text);
    return items.map(item => {
      const priorityMatch = item.match(/(CRITICAL|HIGH|MEDIUM|LOW)/i);
      return {
        action: item,
        priority: priorityMatch ? priorityMatch[1].toUpperCase() : 'MEDIUM',
        timeframe: this.extractTimeframe(item)
      };
    });
  }

  extractResourceItems(text) {
    const items = this.extractListItems(text);
    return items.map(item => ({
      resource: item,
      location: this.extractLocation(item),
      quantity: this.extractQuantity(item)
    }));
  }

  extractPriorityItems(text) {
    const items = this.extractListItems(text);
    return items.map((item, index) => ({
      priority: index + 1,
      task: item,
      urgency: index === 0 ? 'IMMEDIATE' : (index === 1 ? 'HIGH' : 'MEDIUM')
    }));
  }

  generateExecutiveSummary(summary) {
    const threatCount = summary.criticalThreats.length;
    const riskCount = summary.predictedRisks.length;
    
    if (threatCount > 0) {
      return `${threatCount} critical threat${threatCount > 1 ? 's' : ''} identified requiring immediate attention. ${riskCount} emerging risks detected.`;
    } else if (riskCount > 0) {
      return `Situation stable with ${riskCount} emerging risk${riskCount > 1 ? 's' : ''} requiring monitoring.`;
    } else {
      return 'Situation normal - no immediate threats or significant risks identified.';
    }
  }

  calculateThreatLevel(threats) {
    if (threats.length === 0) return 'GREEN';
    if (threats.some(t => t.toLowerCase().includes('critical'))) return 'RED';
    if (threats.length > 2) return 'ORANGE';
    return 'YELLOW';
  }

  prioritizeActions(actions) {
    return actions.sort((a, b) => {
      const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  calculateAlertLevel(summary) {
    const threatCount = summary.criticalThreats.length;
    const confidence = summary.confidence;
    
    if (threatCount > 2 && confidence > 0.8) return 'CRITICAL';
    if (threatCount > 0 && confidence > 0.7) return 'HIGH';
    if (summary.predictedRisks.length > 3) return 'MEDIUM';
    return 'LOW';
  }

  async storeSituationalQuery(query, briefing, context) {
    await this.db.collection('situational_queries').add({
      query,
      briefing,
      context,
      timestamp: new Date(),
      confidence: briefing.confidence,
      alert_level: briefing.alertLevel
    });
  }

  // Additional helper methods...
  parseIntentFallback(query, response) { /* fallback parsing */ }
  extractTimeframe(text) { /* extract timeframe from text */ }
  extractLocation(text) { /* extract location from text */ }
  extractQuantity(text) { /* extract quantity from text */ }
  extractCrowdDensity(metrics) { /* extract crowd density */ }
  extractCrowdSentiment(socialData) { /* extract sentiment */ }
  extractFlowPatterns(analytics) { /* extract flow patterns */ }
  optimizeResourceDeployment(allocation) { /* optimize resources */ }
  calculateNextAssessmentTime(summary) { return new Date(Date.now() + 15 * 60 * 1000); }
}

module.exports = SituationalIntelligenceAgent;
