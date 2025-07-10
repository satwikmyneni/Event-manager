/**
 * Autonomous Emergency Dispatch Agent
 * Handles automatic emergency response coordination using Google Maps API
 */

const axios = require('axios');

class EmergencyDispatchAgent {
  constructor(googleMapsApiKey) {
    this.mapsApiKey = googleMapsApiKey;
    this.activeUnits = new Map(); // Track available emergency units
    this.activeDispatches = new Map(); // Track ongoing dispatches
    this.emergencyTypes = {
      MEDICAL: { priority: 1, requiredUnits: ['ambulance', 'medic'] },
      FIRE: { priority: 1, requiredUnits: ['fire_truck', 'fire_crew'] },
      SECURITY: { priority: 2, requiredUnits: ['security', 'police'] },
      EVACUATION: { priority: 1, requiredUnits: ['security', 'police', 'medic'] },
      CROWD_CONTROL: { priority: 2, requiredUnits: ['security'] }
    };
  }

  /**
   * Initialize emergency units and their locations
   */
  initializeUnits(units) {
    units.forEach(unit => {
      this.activeUnits.set(unit.id, {
        ...unit,
        status: 'available', // available, dispatched, busy
        lastUpdate: new Date(),
        currentLocation: unit.baseLocation
      });
    });
  }

  /**
   * Process emergency report and dispatch appropriate units
   * @param {Object} emergency - Emergency details
   */
  async processEmergency(emergency) {
    try {
      console.log(`Processing emergency: ${emergency.type} at ${emergency.location}`);
      
      // Validate and enrich emergency data
      const processedEmergency = await this.validateEmergency(emergency);
      
      // Find available units
      const availableUnits = await this.findAvailableUnits(processedEmergency);
      
      if (availableUnits.length === 0) {
        return this.handleNoUnitsAvailable(processedEmergency);
      }

      // Calculate optimal dispatch plan
      const dispatchPlan = await this.calculateOptimalDispatch(processedEmergency, availableUnits);
      
      // Execute dispatch
      const dispatchResult = await this.executeDispatch(dispatchPlan);
      
      // Update dashboard and notify supervisors
      await this.updateDashboard(dispatchResult);
      await this.notifySupervisors(dispatchResult);
      
      return dispatchResult;

    } catch (error) {
      console.error('Error processing emergency:', error);
      throw error;
    }
  }

  /**
   * Validate and enrich emergency data
   */
  async validateEmergency(emergency) {
    const processed = { ...emergency };
    
    // Extract precise location from geo-tag or description
    if (emergency.geoTag) {
      processed.coordinates = {
        lat: emergency.geoTag.latitude,
        lng: emergency.geoTag.longitude
      };
    } else if (emergency.location) {
      // Geocode location description
      processed.coordinates = await this.geocodeLocation(emergency.location);
    }

    // Determine emergency priority
    processed.priority = this.emergencyTypes[emergency.type]?.priority || 3;
    
    // Add timestamp if not present
    processed.timestamp = emergency.timestamp || new Date();
    
    // Generate unique emergency ID
    processed.emergencyId = emergency.id || this.generateEmergencyId();
    
    // Assess severity based on description and type
    processed.severity = this.assessSeverity(emergency);
    
    return processed;
  }

  /**
   * Find available units suitable for the emergency
   */
  async findAvailableUnits(emergency) {
    const requiredUnitTypes = this.emergencyTypes[emergency.type]?.requiredUnits || ['security'];
    const availableUnits = [];

    for (const [unitId, unit] of this.activeUnits) {
      if (unit.status === 'available' && requiredUnitTypes.includes(unit.type)) {
        // Calculate distance and ETA to emergency location
        const routeInfo = await this.calculateRoute(unit.currentLocation, emergency.coordinates);
        
        availableUnits.push({
          ...unit,
          distanceToEmergency: routeInfo.distance,
          etaToEmergency: routeInfo.duration,
          routeToEmergency: routeInfo.route
        });
      }
    }

    // Sort by priority factors: distance, unit capability, current workload
    return availableUnits.sort((a, b) => {
      const scoreA = this.calculateUnitScore(a, emergency);
      const scoreB = this.calculateUnitScore(b, emergency);
      return scoreB - scoreA; // Higher score is better
    });
  }

  /**
   * Calculate optimal dispatch plan
   */
  async calculateOptimalDispatch(emergency, availableUnits) {
    const requiredUnitTypes = this.emergencyTypes[emergency.type]?.requiredUnits || ['security'];
    const selectedUnits = [];
    const usedTypes = new Set();

    // Select best unit for each required type
    for (const unitType of requiredUnitTypes) {
      const bestUnit = availableUnits.find(unit => 
        unit.type === unitType && !usedTypes.has(unit.id)
      );
      
      if (bestUnit) {
        selectedUnits.push(bestUnit);
        usedTypes.add(bestUnit.id);
      }
    }

    // Calculate coordinated arrival if multiple units
    const coordinatedRoutes = await this.coordinateMultipleUnits(selectedUnits, emergency);

    return {
      emergencyId: emergency.emergencyId,
      emergency,
      selectedUnits,
      coordinatedRoutes,
      estimatedResponseTime: Math.max(...selectedUnits.map(u => u.etaToEmergency)),
      dispatchTime: new Date()
    };
  }

  /**
   * Execute the dispatch plan
   */
  async executeDispatch(dispatchPlan) {
    const dispatchResults = [];

    for (const unit of dispatchPlan.selectedUnits) {
      try {
        // Update unit status
        this.activeUnits.get(unit.id).status = 'dispatched';
        this.activeUnits.get(unit.id).currentEmergency = dispatchPlan.emergencyId;
        
        // Send dispatch notification to unit
        const dispatchNotification = await this.sendDispatchNotification(unit, dispatchPlan);
        
        // Track the dispatch
        this.activeDispatches.set(`${dispatchPlan.emergencyId}-${unit.id}`, {
          emergencyId: dispatchPlan.emergencyId,
          unitId: unit.id,
          dispatchTime: new Date(),
          estimatedArrival: new Date(Date.now() + unit.etaToEmergency * 60000),
          status: 'en_route',
          route: unit.routeToEmergency
        });

        dispatchResults.push({
          unitId: unit.id,
          unitType: unit.type,
          status: 'dispatched',
          eta: unit.etaToEmergency,
          route: unit.routeToEmergency,
          notification: dispatchNotification
        });

      } catch (error) {
        console.error(`Error dispatching unit ${unit.id}:`, error);
        dispatchResults.push({
          unitId: unit.id,
          status: 'dispatch_failed',
          error: error.message
        });
      }
    }

    return {
      ...dispatchPlan,
      dispatchResults,
      overallStatus: dispatchResults.every(r => r.status === 'dispatched') ? 'success' : 'partial'
    };
  }

  /**
   * Calculate route using Google Maps API
   */
  async calculateRoute(origin, destination, avoidCrowds = true) {
    try {
      const params = {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        key: this.mapsApiKey,
        mode: 'driving',
        departure_time: 'now',
        traffic_model: 'best_guess'
      };

      // Add crowd avoidance if enabled
      if (avoidCrowds) {
        params.avoid = 'tolls'; // In production, would use real-time crowd data
      }

      const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', { params });
      
      if (response.data.status === 'OK' && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        const leg = route.legs[0];
        
        return {
          distance: leg.distance.value, // meters
          duration: leg.duration_in_traffic?.value || leg.duration.value, // seconds
          route: {
            polyline: route.overview_polyline.points,
            steps: leg.steps.map(step => ({
              instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
              distance: step.distance.text,
              duration: step.duration.text
            }))
          }
        };
      } else {
        throw new Error(`Routing failed: ${response.data.status}`);
      }

    } catch (error) {
      console.error('Error calculating route:', error);
      // Fallback to straight-line distance
      return this.calculateStraightLineDistance(origin, destination);
    }
  }

  /**
   * Coordinate multiple units for synchronized arrival
   */
  async coordinateMultipleUnits(units, emergency) {
    if (units.length <= 1) return units.map(u => u.routeToEmergency);

    const coordinatedRoutes = [];
    const maxETA = Math.max(...units.map(u => u.etaToEmergency));

    for (const unit of units) {
      if (unit.etaToEmergency < maxETA) {
        // Calculate staging point for early-arriving units
        const stagingPoint = await this.findStagingPoint(unit, emergency, maxETA - unit.etaToEmergency);
        coordinatedRoutes.push({
          unitId: unit.id,
          primaryRoute: unit.routeToEmergency,
          stagingPoint,
          coordinatedArrival: maxETA
        });
      } else {
        coordinatedRoutes.push({
          unitId: unit.id,
          primaryRoute: unit.routeToEmergency,
          coordinatedArrival: unit.etaToEmergency
        });
      }
    }

    return coordinatedRoutes;
  }

  /**
   * Send dispatch notification to unit
   */
  async sendDispatchNotification(unit, dispatchPlan) {
    const notification = {
      unitId: unit.id,
      emergencyId: dispatchPlan.emergencyId,
      emergencyType: dispatchPlan.emergency.type,
      location: dispatchPlan.emergency.location,
      coordinates: dispatchPlan.emergency.coordinates,
      priority: dispatchPlan.emergency.priority,
      description: dispatchPlan.emergency.description,
      route: unit.routeToEmergency,
      eta: unit.etaToEmergency,
      timestamp: new Date()
    };

    // In production, this would send to unit's communication system
    console.log(`Dispatching ${unit.type} unit ${unit.id} to ${dispatchPlan.emergency.type} emergency`);
    
    return notification;
  }

  /**
   * Update live dashboard with dispatch information
   */
  async updateDashboard(dispatchResult) {
    const dashboardUpdate = {
      type: 'EMERGENCY_DISPATCH',
      emergencyId: dispatchResult.emergencyId,
      emergency: dispatchResult.emergency,
      dispatchedUnits: dispatchResult.dispatchResults,
      status: dispatchResult.overallStatus,
      timestamp: new Date()
    };

    // In production, this would update Firebase/real-time dashboard
    console.log('Dashboard updated with dispatch information');
    
    return dashboardUpdate;
  }

  /**
   * Notify supervisors of emergency dispatch
   */
  async notifySupervisors(dispatchResult) {
    const notification = {
      type: 'EMERGENCY_DISPATCH_NOTIFICATION',
      severity: dispatchResult.emergency.severity,
      message: `${dispatchResult.emergency.type} emergency at ${dispatchResult.emergency.location}. ${dispatchResult.dispatchResults.length} units dispatched.`,
      emergencyId: dispatchResult.emergencyId,
      estimatedResponseTime: dispatchResult.estimatedResponseTime,
      timestamp: new Date()
    };

    // In production, this would send notifications via multiple channels
    console.log('Supervisors notified of emergency dispatch');
    
    return notification;
  }

  /**
   * Handle case when no units are available
   */
  handleNoUnitsAvailable(emergency) {
    console.warn(`No units available for ${emergency.type} emergency at ${emergency.location}`);
    
    return {
      emergencyId: emergency.emergencyId,
      status: 'no_units_available',
      emergency,
      escalation: {
        escalated: true,
        escalationTime: new Date(),
        reason: 'No available units',
        suggestedActions: [
          'Contact external emergency services',
          'Reassign units from lower priority tasks',
          'Activate backup response protocols'
        ]
      }
    };
  }

  /**
   * Utility methods
   */
  async geocodeLocation(locationDescription) {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: locationDescription,
          key: this.mapsApiKey
        }
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        return { lat: location.lat, lng: location.lng };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    
    // Return default coordinates if geocoding fails
    return { lat: 0, lng: 0 };
  }

  calculateUnitScore(unit, emergency) {
    let score = 100;
    
    // Distance factor (closer is better)
    score -= unit.distanceToEmergency / 1000; // Reduce score by km distance
    
    // ETA factor (faster response is better)
    score -= unit.etaToEmergency / 60; // Reduce score by minutes
    
    // Unit capability factor
    if (unit.specialCapabilities && unit.specialCapabilities.includes(emergency.type)) {
      score += 20;
    }
    
    // Unit availability factor
    if (unit.status === 'available') {
      score += 10;
    }
    
    return score;
  }

  calculateStraightLineDistance(origin, destination) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = origin.lat * Math.PI/180;
    const φ2 = destination.lat * Math.PI/180;
    const Δφ = (destination.lat-origin.lat) * Math.PI/180;
    const Δλ = (destination.lng-origin.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const distance = R * c;
    const estimatedDuration = distance / 15; // Assume 15 m/s average speed

    return {
      distance,
      duration: estimatedDuration,
      route: { polyline: '', steps: [] }
    };
  }

  assessSeverity(emergency) {
    const severityKeywords = {
      critical: ['life threatening', 'unconscious', 'fire', 'explosion', 'stampede'],
      high: ['injury', 'medical', 'smoke', 'panic', 'violence'],
      medium: ['suspicious', 'disturbance', 'lost', 'minor injury'],
      low: ['noise complaint', 'littering', 'general inquiry']
    };

    const description = emergency.description?.toLowerCase() || '';
    
    for (const [level, keywords] of Object.entries(severityKeywords)) {
      if (keywords.some(keyword => description.includes(keyword))) {
        return level;
      }
    }
    
    return 'medium';
  }

  generateEmergencyId() {
    return `EMG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async findStagingPoint(unit, emergency, waitTime) {
    // Find a point between unit and emergency for staging
    const midLat = (unit.currentLocation.lat + emergency.coordinates.lat) / 2;
    const midLng = (unit.currentLocation.lng + emergency.coordinates.lng) / 2;
    
    return {
      lat: midLat,
      lng: midLng,
      waitTime: waitTime * 60 // Convert to seconds
    };
  }

  /**
   * Update unit location (called by units in the field)
   */
  updateUnitLocation(unitId, location) {
    if (this.activeUnits.has(unitId)) {
      this.activeUnits.get(unitId).currentLocation = location;
      this.activeUnits.get(unitId).lastUpdate = new Date();
    }
  }

  /**
   * Update unit status
   */
  updateUnitStatus(unitId, status) {
    if (this.activeUnits.has(unitId)) {
      this.activeUnits.get(unitId).status = status;
      this.activeUnits.get(unitId).lastUpdate = new Date();
    }
  }

  /**
   * Get current dispatch status
   */
  getDispatchStatus(emergencyId) {
    const dispatches = Array.from(this.activeDispatches.values())
      .filter(dispatch => dispatch.emergencyId === emergencyId);
    
    return {
      emergencyId,
      activeDispatches: dispatches,
      totalUnits: dispatches.length,
      status: dispatches.length > 0 ? 'active' : 'completed'
    };
  }
}

module.exports = EmergencyDispatchAgent;
