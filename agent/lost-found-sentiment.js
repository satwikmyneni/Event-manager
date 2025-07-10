/**
 * Lost & Found and Crowd Sentiment Analysis Agent
 * Uses Gemini Vision for person tracking and sentiment analysis
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ImageAnnotatorClient } = require('@google-cloud/vision');

class LostFoundSentimentAgent {
  constructor(geminiApiKey) {
    this.genAI = new GoogleGenerativeAI(geminiApiKey);
    this.visionModel = this.genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
    this.textModel = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    this.googleVision = new ImageAnnotatorClient();
    
    this.activeMissingPersons = new Map();
    this.sentimentHistory = new Map(); // cameraId -> sentiment data
    this.faceMatchingCache = new Map();
    this.socialMediaBuffer = [];
  }

  /**
   * Report a missing person with photo and details
   * @param {Object} missingPersonReport - Contains photo, description, last known location
   */
  async reportMissingPerson(missingPersonReport) {
    try {
      const personId = this.generatePersonId();
      
      // Extract facial features using Gemini Vision
      const facialFeatures = await this.extractFacialFeatures(missingPersonReport.photo);
      
      // Create search profile
      const searchProfile = {
        id: personId,
        reportTime: new Date(),
        photo: missingPersonReport.photo,
        facialFeatures,
        description: missingPersonReport.description,
        lastKnownLocation: missingPersonReport.lastKnownLocation,
        contactInfo: missingPersonReport.contactInfo,
        status: 'active',
        matches: [],
        searchHistory: []
      };

      this.activeMissingPersons.set(personId, searchProfile);

      // Start immediate search across all camera feeds
      const initialSearchResults = await this.searchAllCameras(searchProfile);

      return {
        personId,
        status: 'search_initiated',
        initialMatches: initialSearchResults,
        searchProfile: {
          id: personId,
          description: searchProfile.description,
          lastKnownLocation: searchProfile.lastKnownLocation,
          reportTime: searchProfile.reportTime
        }
      };

    } catch (error) {
      console.error('Error reporting missing person:', error);
      throw error;
    }
  }

  /**
   * Search for missing person in camera feed
   * @param {Buffer} cameraFrame - Current camera frame
   * @param {Object} cameraMetadata - Camera location and info
   */
  async searchInCameraFeed(cameraFrame, cameraMetadata) {
    const matches = [];

    for (const [personId, profile] of this.activeMissingPersons) {
      try {
        const matchResult = await this.findPersonInFrame(cameraFrame, profile, cameraMetadata);
        
        if (matchResult.confidence > 0.7) {
          matches.push({
            personId,
            confidence: matchResult.confidence,
            location: cameraMetadata.location,
            cameraId: cameraMetadata.cameraId,
            timestamp: new Date(),
            boundingBox: matchResult.boundingBox,
            description: matchResult.description
          });

          // Update search profile
          profile.matches.push(matches[matches.length - 1]);
          profile.searchHistory.push({
            cameraId: cameraMetadata.cameraId,
            timestamp: new Date(),
            result: 'match_found',
            confidence: matchResult.confidence
          });
        }

      } catch (error) {
        console.error(`Error searching for person ${personId}:`, error);
      }
    }

    return matches;
  }

  /**
   * Analyze crowd sentiment from video feed
   * @param {Buffer} cameraFrame - Video frame
   * @param {Object} cameraMetadata - Camera info
   */
  async analyzeCrowdSentiment(cameraFrame, cameraMetadata) {
    try {
      // Use Gemini Vision to analyze facial expressions and body language
      const sentimentAnalysis = await this.analyzeVisualSentiment(cameraFrame, cameraMetadata);
      
      // Get recent social media data for this location
      const socialSentiment = await this.analyzeSocialMediaSentiment(cameraMetadata.location);
      
      // Combine visual and social sentiment
      const combinedSentiment = this.combineSentimentSources(sentimentAnalysis, socialSentiment);
      
      // Store sentiment history
      this.updateSentimentHistory(cameraMetadata.cameraId, combinedSentiment);
      
      // Generate sentiment alerts if needed
      const alerts = this.generateSentimentAlerts(combinedSentiment, cameraMetadata);

      return {
        cameraId: cameraMetadata.cameraId,
        location: cameraMetadata.location,
        sentiment: combinedSentiment,
        alerts,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Error analyzing crowd sentiment:', error);
      throw error;
    }
  }

  /**
   * Extract facial features using Gemini Vision
   */
  async extractFacialFeatures(photoBuffer) {
    const prompt = `Analyze this photo and extract detailed facial features for person identification:

    Provide a detailed description including:
    1. Facial structure (face shape, jawline, cheekbones)
    2. Eyes (color, shape, size, distinctive features)
    3. Nose (shape, size)
    4. Mouth and lips (shape, size)
    5. Hair (color, style, length)
    6. Distinctive features (scars, tattoos, glasses, etc.)
    7. Approximate age and build
    8. Clothing description

    Format as structured JSON for matching purposes.`;

    try {
      const result = await this.visionModel.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: photoBuffer.toString('base64')
          }
        }
      ]);

      const response = result.response.text();
      return this.parseFacialFeatures(response);

    } catch (error) {
      console.error('Error extracting facial features:', error);
      return { error: error.message };
    }
  }

  /**
   * Find person in camera frame using Gemini Vision
   */
  async findPersonInFrame(cameraFrame, profile, cameraMetadata) {
    const prompt = `You are helping locate a missing person. Compare the people in this camera feed image with the following description:

    MISSING PERSON DESCRIPTION:
    ${JSON.stringify(profile.facialFeatures, null, 2)}

    ADDITIONAL INFO:
    - Description: ${profile.description}
    - Last known location: ${profile.lastKnownLocation}

    Analyze each person visible in the image and determine if any match the missing person description.

    For each potential match, provide:
    1. Confidence level (0-1)
    2. Location in image (describe position)
    3. Matching features
    4. Differences noted
    5. Overall assessment

    Return JSON format with matches array.`;

    try {
      const result = await this.visionModel.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: cameraFrame.toString('base64')
          }
        }
      ]);

      const response = result.response.text();
      return this.parsePersonMatchResults(response);

    } catch (error) {
      console.error('Error finding person in frame:', error);
      return { confidence: 0, error: error.message };
    }
  }

  /**
   * Analyze visual sentiment from crowd expressions
   */
  async analyzeVisualSentiment(cameraFrame, cameraMetadata) {
    const prompt = `Analyze the crowd sentiment in this image from a public event. Look at:

    1. Facial expressions of visible people
    2. Body language and posture
    3. Overall crowd energy and mood
    4. Signs of stress, excitement, calm, or agitation
    5. Group dynamics and interactions

    Categorize the overall sentiment as:
    - CALM: Relaxed, peaceful, content
    - EXCITED: Positive energy, enthusiasm
    - TENSE: Anxious, worried, uncomfortable
    - AGITATED: Angry, frustrated, hostile
    - MIXED: Combination of different moods

    Provide:
    - Overall sentiment category
    - Confidence level (0-1)
    - Percentage breakdown of different emotions observed
    - Notable observations
    - Risk assessment for crowd management

    Return structured JSON response.`;

    try {
      const result = await this.visionModel.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: cameraFrame.toString('base64')
          }
        }
      ]);

      const response = result.response.text();
      return this.parseVisualSentiment(response);

    } catch (error) {
      console.error('Error analyzing visual sentiment:', error);
      return {
        sentiment: 'UNKNOWN',
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Analyze social media sentiment for location
   */
  async analyzeSocialMediaSentiment(location) {
    // Get recent social media posts for this location
    const relevantPosts = this.socialMediaBuffer.filter(post => 
      post.location === location && 
      (Date.now() - post.timestamp.getTime()) < 30 * 60 * 1000 // Last 30 minutes
    );

    if (relevantPosts.length === 0) {
      return {
        sentiment: 'NEUTRAL',
        confidence: 0.5,
        postCount: 0,
        source: 'social_media'
      };
    }

    // Use Gemini to analyze combined social media content
    const combinedContent = relevantPosts.map(post => post.content).join('\n');
    
    const prompt = `Analyze the sentiment of these social media posts from a public event location:

    POSTS:
    ${combinedContent}

    Determine:
    1. Overall sentiment (POSITIVE, NEGATIVE, NEUTRAL, MIXED)
    2. Confidence level (0-1)
    3. Key themes and concerns mentioned
    4. Urgency level of any issues
    5. Crowd safety implications

    Return structured JSON response.`;

    try {
      const result = await this.textModel.generateContent(prompt);
      const response = result.response.text();
      
      return {
        ...this.parseSocialSentiment(response),
        postCount: relevantPosts.length,
        source: 'social_media'
      };

    } catch (error) {
      console.error('Error analyzing social media sentiment:', error);
      return {
        sentiment: 'NEUTRAL',
        confidence: 0.5,
        postCount: relevantPosts.length,
        error: error.message
      };
    }
  }

  /**
   * Combine visual and social sentiment analysis
   */
  combineSentimentSources(visualSentiment, socialSentiment) {
    const sentimentMapping = {
      'CALM': 1,
      'EXCITED': 2,
      'NEUTRAL': 0,
      'POSITIVE': 1,
      'TENSE': -1,
      'AGITATED': -2,
      'NEGATIVE': -2,
      'MIXED': 0
    };

    const visualScore = sentimentMapping[visualSentiment.sentiment] || 0;
    const socialScore = sentimentMapping[socialSentiment.sentiment] || 0;

    // Weight visual sentiment more heavily as it's more immediate
    const combinedScore = (visualScore * 0.7) + (socialScore * 0.3);
    
    let combinedSentiment;
    if (combinedScore >= 1.5) combinedSentiment = 'VERY_POSITIVE';
    else if (combinedScore >= 0.5) combinedSentiment = 'POSITIVE';
    else if (combinedScore <= -1.5) combinedSentiment = 'VERY_NEGATIVE';
    else if (combinedScore <= -0.5) combinedSentiment = 'NEGATIVE';
    else combinedSentiment = 'NEUTRAL';

    return {
      overall: combinedSentiment,
      score: combinedScore,
      confidence: (visualSentiment.confidence + socialSentiment.confidence) / 2,
      sources: {
        visual: visualSentiment,
        social: socialSentiment
      },
      breakdown: this.calculateSentimentBreakdown(visualSentiment, socialSentiment)
    };
  }

  /**
   * Generate alerts based on sentiment analysis
   */
  generateSentimentAlerts(sentiment, cameraMetadata) {
    const alerts = [];

    // Alert for very negative sentiment
    if (sentiment.overall === 'VERY_NEGATIVE' && sentiment.confidence > 0.7) {
      alerts.push({
        type: 'NEGATIVE_SENTIMENT',
        severity: 'HIGH',
        location: cameraMetadata.location,
        message: 'Very negative crowd sentiment detected',
        confidence: sentiment.confidence,
        recommendations: [
          'Increase security presence',
          'Monitor for potential incidents',
          'Consider crowd management interventions'
        ]
      });
    }

    // Alert for rapid sentiment change
    const previousSentiment = this.getPreviousSentiment(cameraMetadata.cameraId);
    if (previousSentiment && this.isRapidSentimentChange(previousSentiment, sentiment)) {
      alerts.push({
        type: 'SENTIMENT_CHANGE',
        severity: 'MEDIUM',
        location: cameraMetadata.location,
        message: 'Rapid crowd sentiment change detected',
        previousSentiment: previousSentiment.overall,
        currentSentiment: sentiment.overall,
        recommendations: [
          'Investigate cause of sentiment change',
          'Monitor situation closely'
        ]
      });
    }

    return alerts;
  }

  /**
   * Search all active cameras for missing person
   */
  async searchAllCameras(profile) {
    // In production, this would query all active camera feeds
    // For now, return mock results
    return [
      {
        cameraId: 'CAM-001',
        location: 'Main Entrance',
        confidence: 0.65,
        timestamp: new Date(),
        status: 'potential_match'
      }
    ];
  }

  /**
   * Update missing person status
   */
  updateMissingPersonStatus(personId, status, location = null) {
    if (this.activeMissingPersons.has(personId)) {
      const profile = this.activeMissingPersons.get(personId);
      profile.status = status;
      profile.lastUpdate = new Date();
      
      if (location) {
        profile.lastKnownLocation = location;
      }

      if (status === 'found') {
        // Notify relevant parties
        this.notifyPersonFound(profile);
      }
    }
  }

  /**
   * Add social media data for sentiment analysis
   */
  addSocialMediaData(posts) {
    posts.forEach(post => {
      this.socialMediaBuffer.push({
        ...post,
        timestamp: new Date(post.timestamp)
      });
    });

    // Keep only recent posts (last 2 hours)
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
    this.socialMediaBuffer = this.socialMediaBuffer.filter(post => post.timestamp > cutoff);
  }

  /**
   * Helper methods
   */
  generatePersonId() {
    return `PERSON-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  parseFacialFeatures(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback to text parsing
      return {
        description: response,
        parsed: false
      };
    } catch (error) {
      return {
        description: response,
        error: error.message
      };
    }
  }

  parsePersonMatchResults(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const matches = parsed.matches || [];
        
        if (matches.length > 0) {
          const bestMatch = matches.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
          );
          
          return {
            confidence: bestMatch.confidence,
            boundingBox: bestMatch.location,
            description: bestMatch.assessment,
            allMatches: matches
          };
        }
      }
      
      return { confidence: 0, description: 'No matches found' };
    } catch (error) {
      return { confidence: 0, error: error.message };
    }
  }

  parseVisualSentiment(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback parsing
      const sentiment = this.extractSentimentFromText(response);
      return {
        sentiment,
        confidence: 0.6,
        source: 'visual_analysis'
      };
    } catch (error) {
      return {
        sentiment: 'UNKNOWN',
        confidence: 0,
        error: error.message
      };
    }
  }

  parseSocialSentiment(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        sentiment: this.extractSentimentFromText(response),
        confidence: 0.6
      };
    } catch (error) {
      return {
        sentiment: 'NEUTRAL',
        confidence: 0.5,
        error: error.message
      };
    }
  }

  extractSentimentFromText(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('calm') || lowerText.includes('peaceful')) return 'CALM';
    if (lowerText.includes('excited') || lowerText.includes('enthusiastic')) return 'EXCITED';
    if (lowerText.includes('tense') || lowerText.includes('anxious')) return 'TENSE';
    if (lowerText.includes('agitated') || lowerText.includes('angry')) return 'AGITATED';
    if (lowerText.includes('positive')) return 'POSITIVE';
    if (lowerText.includes('negative')) return 'NEGATIVE';
    
    return 'NEUTRAL';
  }

  updateSentimentHistory(cameraId, sentiment) {
    if (!this.sentimentHistory.has(cameraId)) {
      this.sentimentHistory.set(cameraId, []);
    }
    
    const history = this.sentimentHistory.get(cameraId);
    history.push({
      ...sentiment,
      timestamp: new Date()
    });

    // Keep only last 100 entries per camera
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  getPreviousSentiment(cameraId) {
    const history = this.sentimentHistory.get(cameraId);
    return history && history.length > 1 ? history[history.length - 2] : null;
  }

  isRapidSentimentChange(previous, current) {
    const sentimentValues = {
      'VERY_POSITIVE': 2,
      'POSITIVE': 1,
      'NEUTRAL': 0,
      'NEGATIVE': -1,
      'VERY_NEGATIVE': -2
    };

    const prevValue = sentimentValues[previous.overall] || 0;
    const currValue = sentimentValues[current.overall] || 0;
    
    return Math.abs(currValue - prevValue) >= 2;
  }

  calculateSentimentBreakdown(visual, social) {
    return {
      visual_weight: 0.7,
      social_weight: 0.3,
      visual_sentiment: visual.sentiment,
      social_sentiment: social.sentiment,
      combined_confidence: (visual.confidence + social.confidence) / 2
    };
  }

  notifyPersonFound(profile) {
    console.log(`Missing person found: ${profile.id} at ${profile.lastKnownLocation}`);
    // In production, would send notifications to contact info
  }

  /**
   * Get current status of all missing persons
   */
  getMissingPersonsStatus() {
    return Array.from(this.activeMissingPersons.values()).map(profile => ({
      id: profile.id,
      status: profile.status,
      reportTime: profile.reportTime,
      lastKnownLocation: profile.lastKnownLocation,
      matchCount: profile.matches.length,
      lastUpdate: profile.lastUpdate
    }));
  }

  /**
   * Get sentiment summary for all locations
   */
  getSentimentSummary() {
    const summary = {};
    
    for (const [cameraId, history] of this.sentimentHistory) {
      if (history.length > 0) {
        const latest = history[history.length - 1];
        summary[cameraId] = {
          current_sentiment: latest.overall,
          confidence: latest.confidence,
          last_update: latest.timestamp,
          trend: this.calculateSentimentTrend(history)
        };
      }
    }
    
    return summary;
  }

  calculateSentimentTrend(history) {
    if (history.length < 3) return 'STABLE';
    
    const recent = history.slice(-3);
    const scores = recent.map(h => h.score);
    
    const trend = scores[2] - scores[0];
    
    if (trend > 0.5) return 'IMPROVING';
    if (trend < -0.5) return 'DECLINING';
    return 'STABLE';
  }
}

module.exports = LostFoundSentimentAgent;
