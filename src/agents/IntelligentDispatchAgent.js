/**
 * Intelligent Dispatch Agent
 * Uses Vertex AI Agent Builder for automated resource dispatch
 */

const { AgentBuilderClient } = require('@google-cloud/agent-builder');
const { Client } = require('@googlemaps/google-maps-services-js');
const { getFirestore } = require('firebase-admin/firestore');

class IntelligentDispatchAgent {
  constructor() {
    this.agentClient = new AgentBuilderClient();
    this.mapsClient = new Client({});
    this.db = getFirestore();
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT;
    this.location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    this.mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    // Initialize dispatch agent
    this.initializeDispatchAgent();
  }

  /**
   * Initialize Vertex AI Agent Builder for dispatch decisions
   */
  async initializeDispatchAgent() {
    try {
      const agentConfig = {
        parent: `projects/${this.projectId}/locations/${this.location}`,
        agent: {
          displayName: 'Emergency Dispatch Coordinator',
          defaultLanguageCode: 'en',
          timeZone: 'America/New_York',
          description: 'AI agent for intelligent emergency response dispatch and coordination',
          avatarUri: 'https://storage.googleapis.com/drishti-assets/dispatch-avatar.png',
          enableStackdriverLogging: true,
          enableSpellCheck: true,
          instructions: `
            You are an expert emergency dispatch coordinator for large public events.
            
            Your responsibilities:
            1. Analyze incoming emergency incidents for type, severity, and location
            2. Identify the most appropriate response units based on incident type and proximity
            3. Calculate optimal dispatch routes considering crowd density and traffic
            4. Coordinate multi-unit responses for complex emergencies
            5. Provide real-time updates and ETAs to command center
            
            Decision criteria:
            - Medical emergencies: Dispatch nearest medical unit + security for crowd control
            - Fire incidents: Dispatch fire crew + medical backup + evacuation coordination
            - Security threats: Dispatch security teams + law enforcement liaison
            - Crowd control: Deploy crowd management teams with barriers and communication
            
            Always prioritize:
            1. Life safety
            2. Fastest response time
            3. Appropriate resource allocation
            4. Minimal disruption to event flow
            
            Provide structured responses with:
            - Recommended units to dispatch
            - Optimal routes and ETAs
            - Additional resources needed
            - Coordination requirements
          `
        }
      };

      const [agent] = await this.agentClient.createAgent(agentConfig);
      this.dispatchAgentId = agent.name;
      console.log('Dispatch agent initialized:', this.dispatchAgentId);

    } catch (error) {
      console.error('Error initializing dispatch agent:', error);
      // Continue with fallback dispatch logic
    }
  }

  /**
   * Process emergency incident and dispatch appropriate resources
   */
  async processEmergencyIncident(incident) {
    try {
      console.log(`Processing emergency: ${incident.type} at ${incident.location}`);
      
      // Step 1: Analyze incident with Vertex AI Agent
      const incidentAnalysis = await this.analyzeIncidentWithAgent(incident);
      
      // Step 2: Get available response units
      const availableUnits = await this.getAvailableResponseUnits(incident.type);
      
      // Step 3: Calculate optimal dispatch plan
      const dispatchPlan = await this.calculateOptimalDispatch(
        incident, 
        availableUnits, 
        incidentAnalysis
      );
      
      // Step 4: Execute dispatch with real-time routing
      const dispatchResult = await this.executeDispatch(dispatchPlan);
      
      // Step 5: Setup real-time tracking and updates
      await this.setupRealTimeTracking(dispatchResult);
      
      return {
        incidentId: incident.id,
        dispatchTime: new Date(),
        unitsDispatched: dispatchResult.units,
        estimatedResponseTime: dispatchResult.fastestETA,
        dispatchPlan: dispatchPlan,
        trackingEnabled: true,
        commandNotified: true
      };

    } catch (error) {
      console.error('Error processing emergency incident:', error);
      throw error;
    }
  }

  /**
   * Analyze incident using Vertex AI Agent Builder
   */
  async analyzeIncidentWithAgent(incident) {
    if (!this.dispatchAgentId) {
      return this.fallbackIncidentAnalysis(incident);
    }

    try {
      const sessionPath = `${this.dispatchAgentId}/sessions/dispatch-${Date.now()}`;
      
      const incidentQuery = `
        EMERGENCY INCIDENT ANALYSIS REQUEST:
        
        Type: ${incident.type}
        Location: ${incident.location}
        Description: ${incident.description}
        Severity: ${incident.severity || 'unknown'}
        Reported by: ${incident.reportedBy}
        Coordinates: ${JSON.stringify(incident.coordinates)}
        Time: ${new Date().toISOString()}
        
        Please analyze this incident and provide:
        1. Incident classification and priority level
        2. Required response unit types and quantities
        3. Special considerations or hazards
        4. Estimated response complexity (simple/moderate/complex)
        5. Additional resources that may be needed
        
        Format your response as structured data for automated processing.
      `;

      const request = {
        session: sessionPath,
        queryInput: {
          text: {
            text: incidentQuery,
            languageCode: 'en'
          }
        }
      };

      const [response] = await this.agentClient.detectIntent(request);
      const agentResponse = response.queryResult.fulfillmentText;
      
      return this.parseAgentAnalysis(agentResponse, incident);

    } catch (error) {
      console.error('Error analyzing incident with agent:', error);
      return this.fallbackIncidentAnalysis(incident);
    }
  }

  /**
   * Get available response units from database
   */
  async getAvailableResponseUnits(incidentType) {
    const unitsSnapshot = await this.db.collection('response_units')
      .where('status', '==', 'available')
      .where('capabilities', 'array-contains-any', this.getRequiredCapabilities(incidentType))
      .get();

    const units = unitsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastUpdate: doc.data().lastUpdate?.toDate() || new Date()
    }));

    // Filter units that haven't updated location recently (>5 minutes = potentially offline)
    const activeUnits = units.filter(unit => 
      (Date.now() - unit.lastUpdate.getTime()) < 5 * 60 * 1000
    );

    return activeUnits;
  }

  /**
   * Calculate optimal dispatch plan using Google Maps and AI analysis
   */
  async calculateOptimalDispatch(incident, availableUnits, analysis) {
    const dispatchPlan = {
      primaryUnits: [],
      backupUnits: [],
      coordinationRequired: false,
      specialInstructions: []
    };

    // Group units by type
    const unitsByType = this.groupUnitsByType(availableUnits);
    
    // For each required unit type, find the best option
    for (const unitType of analysis.requiredUnits) {
      const candidateUnits = unitsByType[unitType] || [];
      
      if (candidateUnits.length === 0) {
        console.warn(`No available units of type ${unitType}`);
        continue;
      }

      // Calculate routes and ETAs for all candidate units
      const unitsWithRoutes = await Promise.all(
        candidateUnits.map(async (unit) => {
          const routeInfo = await this.calculateOptimalRoute(
            unit.currentLocation,
            incident.coordinates,
            incident.priority
          );
          
          return {
            ...unit,
            route: routeInfo.route,
            eta: routeInfo.duration,
            distance: routeInfo.distance
          };
        })
      );

      // Select best unit based on ETA, capability match, and current workload
      const bestUnit = this.selectBestUnit(unitsWithRoutes, incident, analysis);
      
      if (bestUnit) {
        dispatchPlan.primaryUnits.push(bestUnit);
        
        // Remove selected unit from available pool
        unitsByType[unitType] = unitsByType[unitType].filter(u => u.id !== bestUnit.id);
      }
    }

    // Add backup units if incident is complex
    if (analysis.complexity === 'complex') {
      dispatchPlan.backupUnits = await this.selectBackupUnits(
        unitsByType, 
        incident, 
        dispatchPlan.primaryUnits
      );
      dispatchPlan.coordinationRequired = true;
    }

    // Add special instructions based on incident type and analysis
    dispatchPlan.specialInstructions = this.generateSpecialInstructions(incident, analysis);

    return dispatchPlan;
  }

  /**
   * Calculate optimal route using Google Maps API with crowd avoidance
   */
  async calculateOptimalRoute(origin, destination, priority = 'normal') {
    try {
      const routeRequest = {
        params: {
          origin: `${origin.lat},${origin.lng}`,
          destination: `${destination.lat},${destination.lng}`,
          key: this.mapsApiKey,
          mode: 'driving',
          departure_time: 'now',
          traffic_model: 'best_guess',
          optimize: true
        }
      };

      // For high priority incidents, avoid tolls and use fastest route
      if (priority === 'critical' || priority === 'high') {
        routeRequest.params.avoid = 'tolls';
        routeRequest.params.traffic_model = 'optimistic';
      }

      const response = await this.mapsClient.directions(routeRequest);
      
      if (response.data.status === 'OK' && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        const leg = route.legs[0];
        
        // Get crowd density along route and adjust if necessary
        const crowdAdjustedRoute = await this.adjustRouteForCrowds(route, priority);
        
        return {
          route: crowdAdjustedRoute,
          duration: leg.duration_in_traffic?.value || leg.duration.value, // seconds
          distance: leg.distance.value, // meters
          polyline: route.overview_polyline.points,
          instructions: leg.steps.map(step => ({
            instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
            distance: step.distance.text,
            duration: step.duration.text
          }))
        };
      } else {
        throw new Error(`Routing failed: ${response.data.status}`);
      }

    } catch (error) {
      console.error('Error calculating route:', error);
      
      // Fallback to straight-line distance calculation
      return this.calculateStraightLineRoute(origin, destination);
    }
  }

  /**
   * Execute dispatch by notifying units and updating database
   */
  async executeDispatch(dispatchPlan) {
    const dispatchResults = {
      units: [],
      fastestETA: Infinity,
      dispatchTime: new Date(),
      success: true
    };

    // Dispatch primary units
    for (const unit of dispatchPlan.primaryUnits) {
      try {
        // Update unit status in database
        await this.db.collection('response_units').doc(unit.id).update({
          status: 'dispatched',
          currentIncident: unit.incidentId,
          dispatchTime: new Date(),
          estimatedArrival: new Date(Date.now() + unit.eta * 1000),
          assignedRoute: unit.route
        });

        // Send dispatch notification to unit
        const dispatchNotification = await this.sendDispatchNotification(unit, dispatchPlan);
        
        // Track fastest ETA
        if (unit.eta < dispatchResults.fastestETA) {
          dispatchResults.fastestETA = unit.eta;
        }

        dispatchResults.units.push({
          unitId: unit.id,
          unitType: unit.type,
          eta: unit.eta,
          status: 'dispatched',
          notification: dispatchNotification.success
        });

      } catch (error) {
        console.error(`Error dispatching unit ${unit.id}:`, error);
        dispatchResults.units.push({
          unitId: unit.id,
          status: 'dispatch_failed',
          error: error.message
        });
        dispatchResults.success = false;
      }
    }

    // Dispatch backup units if needed
    for (const backupUnit of dispatchPlan.backupUnits) {
      await this.dispatchBackupUnit(backupUnit, dispatchPlan);
    }

    return dispatchResults;
  }

  /**
   * Setup real-time tracking for dispatched units
   */
  async setupRealTimeTracking(dispatchResult) {
    for (const unit of dispatchResult.units) {
      if (unit.status === 'dispatched') {
        // Create tracking document
        await this.db.collection('unit_tracking').doc(unit.unitId).set({
          unitId: unit.unitId,
          incidentId: dispatchResult.incidentId,
          status: 'en_route',
          dispatchTime: dispatchResult.dispatchTime,
          estimatedArrival: new Date(Date.now() + unit.eta * 1000),
          lastUpdate: new Date(),
          trackingActive: true
        });

        // Setup real-time location updates (would integrate with unit GPS systems)
        this.startLocationTracking(unit.unitId);
      }
    }
  }

  /**
   * Send dispatch notification to response unit
   */
  async sendDispatchNotification(unit, dispatchPlan) {
    const notification = {
      unitId: unit.id,
      incidentType: dispatchPlan.incident?.type,
      location: dispatchPlan.incident?.location,
      coordinates: dispatchPlan.incident?.coordinates,
      priority: dispatchPlan.incident?.priority || 'medium',
      description: dispatchPlan.incident?.description,
      route: unit.route,
      eta: unit.eta,
      specialInstructions: dispatchPlan.specialInstructions,
      contactInfo: dispatchPlan.incident?.contactInfo,
      timestamp: new Date()
    };

    try {
      // In production, this would send via multiple channels:
      // - Mobile app push notification
      // - Radio dispatch
      // - SMS backup
      // - Email notification
      
      console.log(`Dispatching ${unit.type} unit ${unit.id} to ${notification.location}`);
      
      // Store notification in database
      await this.db.collection('dispatch_notifications').add(notification);
      
      return { success: true, notificationId: 'notification_id' };
      
    } catch (error) {
      console.error('Error sending dispatch notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper methods
   */
  getRequiredCapabilities(incidentType) {
    const capabilityMap = {
      'MEDICAL': ['medical', 'first_aid', 'ambulance'],
      'FIRE': ['fire_suppression', 'evacuation', 'hazmat'],
      'SECURITY': ['security', 'crowd_control', 'law_enforcement'],
      'CROWD_CONTROL': ['crowd_control', 'barriers', 'communication'],
      'EVACUATION': ['evacuation', 'crowd_control', 'communication'],
      'HAZMAT': ['hazmat', 'fire_suppression', 'medical'],
      'STRUCTURAL': ['engineering', 'evacuation', 'safety']
    };

    return capabilityMap[incidentType] || ['general_response'];
  }

  groupUnitsByType(units) {
    const grouped = {};
    units.forEach(unit => {
      if (!grouped[unit.type]) {
        grouped[unit.type] = [];
      }
      grouped[unit.type].push(unit);
    });
    return grouped;
  }

  selectBestUnit(unitsWithRoutes, incident, analysis) {
    if (unitsWithRoutes.length === 0) return null;

    // Score units based on multiple factors
    const scoredUnits = unitsWithRoutes.map(unit => {
      let score = 100;
      
      // ETA factor (lower is better)
      score -= unit.eta / 60; // Reduce score by minutes
      
      // Capability match factor
      const capabilityMatch = this.calculateCapabilityMatch(unit.capabilities, incident.type);
      score += capabilityMatch * 20;
      
      // Unit availability factor
      score += unit.status === 'available' ? 10 : 0;
      
      // Experience factor
      score += (unit.experienceLevel || 1) * 5;
      
      // Equipment factor
      score += (unit.equipmentRating || 1) * 3;
      
      return { ...unit, score };
    });

    // Return unit with highest score
    return scoredUnits.reduce((best, current) => 
      current.score > best.score ? current : best
    );
  }

  async selectBackupUnits(unitsByType, incident, primaryUnits) {
    const backupUnits = [];
    const primaryUnitTypes = primaryUnits.map(u => u.type);
    
    // Select one backup unit from different types
    for (const [unitType, units] of Object.entries(unitsByType)) {
      if (!primaryUnitTypes.includes(unitType) && units.length > 0) {
        const backupUnit = units[0]; // Select first available
        const routeInfo = await this.calculateOptimalRoute(
          backupUnit.currentLocation,
          incident.coordinates,
          'backup'
        );
        
        backupUnits.push({
          ...backupUnit,
          route: routeInfo.route,
          eta: routeInfo.duration,
          role: 'backup'
        });
        
        if (backupUnits.length >= 2) break; // Limit backup units
      }
    }
    
    return backupUnits;
  }

  generateSpecialInstructions(incident, analysis) {
    const instructions = [];
    
    if (incident.type === 'MEDICAL') {
      instructions.push('Coordinate with on-site medical team');
      instructions.push('Prepare for potential crowd control needs');
    }
    
    if (incident.type === 'FIRE') {
      instructions.push('Establish evacuation perimeter');
      instructions.push('Coordinate with fire department');
      instructions.push('Monitor wind direction and crowd movement');
    }
    
    if (analysis.complexity === 'complex') {
      instructions.push('Multi-unit coordination required');
      instructions.push('Establish command post on arrival');
    }
    
    if (incident.priority === 'critical') {
      instructions.push('Code 3 response authorized');
      instructions.push('Clear fastest route to incident');
    }
    
    return instructions;
  }

  async adjustRouteForCrowds(route, priority) {
    // In production, this would check crowd density along route
    // and suggest alternative paths if needed
    
    if (priority === 'critical') {
      // For critical incidents, use route as-is for speed
      return route;
    }
    
    // For normal incidents, could optimize for crowd avoidance
    return route;
  }

  calculateStraightLineRoute(origin, destination) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = origin.lat * Math.PI/180;
    const φ2 = destination.lat * Math.PI/180;
    const Δφ = (destination.lat - origin.lat) * Math.PI/180;
    const Δλ = (destination.lng - origin.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const distance = R * c;
    const estimatedDuration = distance / 15; // Assume 15 m/s average speed

    return {
      route: { summary: 'Direct route (estimated)' },
      duration: estimatedDuration,
      distance: distance,
      polyline: '',
      instructions: [{ instruction: 'Proceed directly to destination', distance: `${(distance/1000).toFixed(1)} km` }]
    };
  }

  parseAgentAnalysis(agentResponse, incident) {
    // Parse structured response from Vertex AI Agent
    try {
      // Look for structured data in response
      const jsonMatch = agentResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback parsing
      return this.fallbackIncidentAnalysis(incident);
      
    } catch (error) {
      console.error('Error parsing agent analysis:', error);
      return this.fallbackIncidentAnalysis(incident);
    }
  }

  fallbackIncidentAnalysis(incident) {
    const analysisMap = {
      'MEDICAL': {
        priority: 'high',
        requiredUnits: ['medical', 'security'],
        complexity: 'moderate',
        specialConsiderations: ['crowd_control_needed', 'medical_equipment_required']
      },
      'FIRE': {
        priority: 'critical',
        requiredUnits: ['fire', 'medical', 'security'],
        complexity: 'complex',
        specialConsiderations: ['evacuation_required', 'hazmat_potential']
      },
      'SECURITY': {
        priority: 'high',
        requiredUnits: ['security', 'law_enforcement'],
        complexity: 'moderate',
        specialConsiderations: ['crowd_management', 'evidence_preservation']
      }
    };

    return analysisMap[incident.type] || {
      priority: 'medium',
      requiredUnits: ['security'],
      complexity: 'simple',
      specialConsiderations: []
    };
  }

  calculateCapabilityMatch(unitCapabilities, incidentType) {
    const requiredCapabilities = this.getRequiredCapabilities(incidentType);
    const matches = unitCapabilities.filter(cap => requiredCapabilities.includes(cap));
    return matches.length / requiredCapabilities.length;
  }

  startLocationTracking(unitId) {
    // In production, this would setup real-time GPS tracking
    console.log(`Started location tracking for unit ${unitId}`);
  }

  async dispatchBackupUnit(backupUnit, dispatchPlan) {
    // Similar to primary dispatch but with backup role
    await this.db.collection('response_units').doc(backupUnit.id).update({
      status: 'standby',
      role: 'backup',
      primaryIncident: dispatchPlan.incident?.id,
      standbyLocation: backupUnit.currentLocation
    });
  }
}

module.exports = IntelligentDispatchAgent;
