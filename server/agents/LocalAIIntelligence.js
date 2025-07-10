/**
 * Local AI Intelligence Agent
 * Uses Ollama for free, local LLM processing
 */

const { Ollama } = require('ollama');
const natural = require('natural');
const sentiment = require('sentiment');

class LocalAIIntelligence {
  constructor() {
    this.ollama = new Ollama({ host: process.env.OLLAMA_HOST || 'http://localhost:11434' });
    this.model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
    this.sentimentAnalyzer = new sentiment();
    this.isInitialized = false;
    this.initialize();
  }

  async initialize() {
    try {
      // Check if Ollama is available
      const models = await this.ollama.list();
      console.log('Available Ollama models:', models.models.map(m => m.name));
      
      // Ensure our model is available
      if (!models.models.find(m => m.name === this.model)) {
        console.log(`Pulling model ${this.model}...`);
        await this.ollama.pull({ model: this.model });
      }
      
      this.isInitialized = true;
      console.log('Local AI Intelligence Agent initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Ollama:', error);
      this.isInitialized = false;
    }
  }

  isReady() {
    return this.isInitialized;
  }

  /**
   * Generate situational summary using local LLM
   */
  async generateSummary(query, relevantData, context = {}) {
    if (!this.isInitialized) {
      return this.generateFallbackSummary(query, relevantData, context);
    }

    try {
      const prompt = this.buildSummaryPrompt(query, relevantData, context);
      
      const response = await this.ollama.generate({
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          max_tokens: 1000
        }
      });

      const summary = this.parseAIResponse(response.response, relevantData);
      
      return {
        query,
        summary,
        timestamp: new Date(),
        confidence: this.calculateConfidence(summary, relevantData),
        dataSourcesUsed: this.getDataSources(relevantData),
        processingTime: response.total_duration || 0,
        model: this.model
      };

    } catch (error) {
      console.error('Error generating AI summary:', error);
      return this.generateFallbackSummary(query, relevantData, context);
    }
  }

  /**
   * Build comprehensive prompt for local LLM
   */
  buildSummaryPrompt(query, data, context) {
    const timeRange = context.timeRange || 'last 30 minutes';
    const location = context.location || 'event area';
    
    return `You are an AI situational awareness analyst for a public event. Analyze the provided data and answer the query.

QUERY: "${query}"
LOCATION: ${location}
TIME RANGE: ${timeRange}

AVAILABLE DATA:

ALERTS (${data.alerts?.length || 0} total):
${this.formatAlerts(data.alerts)}

EMERGENCIES (${data.emergencies?.length || 0} total):
${this.formatEmergencies(data.emergencies)}

CROWD DATA:
${this.formatCrowdData(data.crowdData)}

SENTIMENT DATA:
${this.formatSentimentData(data.sentimentData)}

Please provide a comprehensive analysis including:
1. CRITICAL EVENTS: Most important incidents or situations
2. CURRENT STATUS: Real-time assessment of the situation  
3. RISK ASSESSMENT: Potential future risks and likelihood
4. SUGGESTED ACTIONS: Specific, actionable recommendations
5. RESOURCE ALLOCATION: Where to deploy personnel/resources

Be concise, specific, and focus on actionable intelligence for public safety.`;
  }

  /**
   * Parse AI response into structured format
   */
  parseAIResponse(response, data) {
    const sections = {
      criticalEvents: [],
      currentStatus: '',
      riskAssessment: '',
      suggestedActions: [],
      resourceAllocation: []
    };

    try {
      // Extract sections using pattern matching
      const criticalMatch = response.match(/CRITICAL EVENTS?:?\s*([\s\S]*?)(?=CURRENT STATUS|$)/i);
      if (criticalMatch) {
        sections.criticalEvents = this.extractListItems(criticalMatch[1]);
      }

      const statusMatch = response.match(/CURRENT STATUS:?\s*([\s\S]*?)(?=RISK ASSESSMENT|$)/i);
      if (statusMatch) {
        sections.currentStatus = statusMatch[1].trim();
      }

      const riskMatch = response.match(/RISK ASSESSMENT:?\s*([\s\S]*?)(?=SUGGESTED ACTIONS|$)/i);
      if (riskMatch) {
        sections.riskAssessment = riskMatch[1].trim();
      }

      const actionsMatch = response.match(/SUGGESTED ACTIONS?:?\s*([\s\S]*?)(?=RESOURCE ALLOCATION|$)/i);
      if (actionsMatch) {
        sections.suggestedActions = this.extractListItems(actionsMatch[1]);
      }

      const resourceMatch = response.match(/RESOURCE ALLOCATION:?\s*([\s\S]*?)$/i);
      if (resourceMatch) {
        sections.resourceAllocation = this.extractListItems(resourceMatch[1]);
      }

      return sections;

    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        summary: response,
        parsed: false,
        error: error.message
      };
    }
  }

  /**
   * Generate fallback summary using rule-based analysis
   */
  generateFallbackSummary(query, data, context) {
    const summary = {
      criticalEvents: [],
      currentStatus: 'System operating in fallback mode',
      riskAssessment: 'Limited analysis available',
      suggestedActions: [],
      resourceAllocation: []
    };

    // Analyze alerts
    const criticalAlerts = (data.alerts || []).filter(a => a.severity === 'CRITICAL');
    const highAlerts = (data.alerts || []).filter(a => a.severity === 'HIGH');

    if (criticalAlerts.length > 0) {
      summary.criticalEvents.push(`${criticalAlerts.length} critical alerts detected`);
      summary.suggestedActions.push('Address critical alerts immediately');
    }

    if (highAlerts.length > 0) {
      summary.criticalEvents.push(`${highAlerts.length} high-priority alerts active`);
    }

    // Analyze emergencies
    const activeEmergencies = (data.emergencies || []).filter(e => e.status === 'active');
    if (activeEmergencies.length > 0) {
      summary.criticalEvents.push(`${activeEmergencies.length} active emergencies`);
      summary.suggestedActions.push('Monitor emergency response progress');
    }

    // Analyze crowd data
    const crowdData = data.crowdData || [];
    if (crowdData.length > 0) {
      const avgDensity = crowdData.reduce((sum, d) => sum + (d.density || 0), 0) / crowdData.length;
      if (avgDensity > 0.8) {
        summary.criticalEvents.push('High crowd density detected');
        summary.suggestedActions.push('Implement crowd control measures');
      }
    }

    return {
      query,
      summary,
      timestamp: new Date(),
      confidence: 0.6,
      dataSourcesUsed: this.getDataSources(data),
      fallbackMode: true
    };
  }

  /**
   * Analyze sentiment using local processing
   */
  analyzeSentiment(text) {
    const result = this.sentimentAnalyzer.analyze(text);
    
    let sentiment = 'NEUTRAL';
    if (result.score > 2) sentiment = 'POSITIVE';
    else if (result.score < -2) sentiment = 'NEGATIVE';
    
    return {
      sentiment,
      score: result.score,
      confidence: Math.min(1, Math.abs(result.score) / 5),
      tokens: result.tokens
    };
  }

  /**
   * Process social media data for sentiment
   */
  processSocialMediaData(posts) {
    if (!posts || posts.length === 0) {
      return {
        overallSentiment: 'NEUTRAL',
        confidence: 0.5,
        postCount: 0
      };
    }

    const sentiments = posts.map(post => this.analyzeSentiment(post.content));
    const avgScore = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;
    
    let overallSentiment = 'NEUTRAL';
    if (avgScore > 1) overallSentiment = 'POSITIVE';
    else if (avgScore < -1) overallSentiment = 'NEGATIVE';

    return {
      overallSentiment,
      score: avgScore,
      confidence: Math.min(1, Math.abs(avgScore) / 3),
      postCount: posts.length,
      breakdown: sentiments
    };
  }

  /**
   * Extract keywords and themes from text
   */
  extractKeywords(text, count = 10) {
    const tokens = natural.WordTokenizer().tokenize(text.toLowerCase());
    const filtered = tokens.filter(token => 
      token.length > 3 && 
      !natural.stopwords.includes(token)
    );
    
    const frequency = {};
    filtered.forEach(token => {
      frequency[token] = (frequency[token] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, count)
      .map(([word, freq]) => ({ word, frequency: freq }));
  }

  /**
   * Helper methods
   */
  formatAlerts(alerts) {
    if (!alerts || alerts.length === 0) return 'No alerts';
    
    return alerts.slice(0, 10).map(alert => 
      `- ${alert.type} (${alert.severity}): ${alert.message} at ${alert.location}`
    ).join('\n');
  }

  formatEmergencies(emergencies) {
    if (!emergencies || emergencies.length === 0) return 'No emergencies';
    
    return emergencies.slice(0, 5).map(emergency => 
      `- ${emergency.type} at ${emergency.location} (Status: ${emergency.status})`
    ).join('\n');
  }

  formatCrowdData(crowdData) {
    if (!crowdData || crowdData.length === 0) return 'No crowd data';
    
    const latest = crowdData.slice(0, 5);
    const avgDensity = latest.reduce((sum, d) => sum + (d.density || 0), 0) / latest.length;
    
    return `Average crowd density: ${(avgDensity * 100).toFixed(1)}%\nRecent measurements: ${latest.length}`;
  }

  formatSentimentData(sentimentData) {
    if (!sentimentData || sentimentData.length === 0) return 'No sentiment data';
    
    const sentiments = sentimentData.map(d => d.sentiment);
    const counts = {};
    sentiments.forEach(s => counts[s] = (counts[s] || 0) + 1);
    
    return Object.entries(counts)
      .map(([sentiment, count]) => `${sentiment}: ${count}`)
      .join(', ');
  }

  extractListItems(text) {
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => line.match(/^[-•*\d]/))
      .map(line => line.replace(/^[-•*\d.]\s*/, ''))
      .filter(line => line.length > 0);
  }

  calculateConfidence(summary, data) {
    let confidence = 0.5;
    
    // Increase confidence based on data availability
    const dataPoints = Object.values(data).reduce((sum, arr) => 
      Array.isArray(arr) ? sum + arr.length : sum, 0);
    
    confidence += Math.min(0.3, dataPoints * 0.01);
    
    // Increase confidence if summary has structured sections
    if (summary.criticalEvents && summary.criticalEvents.length > 0) confidence += 0.1;
    if (summary.suggestedActions && summary.suggestedActions.length > 0) confidence += 0.1;
    
    return Math.min(0.95, confidence);
  }

  getDataSources(data) {
    const sources = [];
    if (data.alerts && data.alerts.length > 0) sources.push('alerts');
    if (data.emergencies && data.emergencies.length > 0) sources.push('emergencies');
    if (data.crowdData && data.crowdData.length > 0) sources.push('crowd_analytics');
    if (data.sentimentData && data.sentimentData.length > 0) sources.push('sentiment_analysis');
    return sources;
  }

  /**
   * Generate map markers from summary
   */
  generateMapMarkers(summary, context) {
    const markers = [];
    
    // Extract locations from critical events
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

    return markers;
  }

  extractLocationFromText(text) {
    // Simple location extraction patterns
    const patterns = [
      /(?:at|near|in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /([A-Z][a-z]+\s+(?:Gate|Stage|Area|Section|Court|Entrance))/g
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  }
}

module.exports = LocalAIIntelligence;
