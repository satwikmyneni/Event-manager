/**
 * Local SQLite Database Utility
 * 100% Free - No cloud dependencies
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.dbPath = process.env.DATABASE_PATH || './data/drishti.db';
    this.db = null;
    this.connected = false;
  }

  async initialize() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Open database connection
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          throw err;
        }
        console.log('Connected to SQLite database:', this.dbPath);
      });

      // Create tables
      await this.createTables();
      this.connected = true;
      
      return true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  async createTables() {
    const tables = [
      // Frame analysis table
      `CREATE TABLE IF NOT EXISTS frame_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        camera_id TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        people_count INTEGER DEFAULT 0,
        density REAL DEFAULT 0,
        velocity REAL DEFAULT 0,
        congestion_level REAL DEFAULT 0,
        motion_intensity REAL DEFAULT 0,
        analysis_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Alerts table
      `CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        camera_id TEXT,
        location TEXT,
        confidence REAL DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active',
        resolved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Emergencies table
      `CREATE TABLE IF NOT EXISTS emergencies (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        description TEXT,
        location TEXT,
        coordinates TEXT,
        severity TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'reported',
        reported_by TEXT,
        dispatch_data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Missing persons table
      `CREATE TABLE IF NOT EXISTS missing_persons (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        last_known_location TEXT,
        contact_info TEXT,
        photo_path TEXT,
        facial_features TEXT,
        status TEXT DEFAULT 'active',
        reported_by TEXT,
        matches_data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        found_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Situational summaries table
      `CREATE TABLE IF NOT EXISTS summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        summary_data TEXT NOT NULL,
        context_data TEXT,
        confidence REAL DEFAULT 0,
        data_sources TEXT,
        processing_time INTEGER DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // System logs table
      `CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        component TEXT,
        metadata TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Camera feeds table
      `CREATE TABLE IF NOT EXISTS cameras (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT,
        coordinates TEXT,
        coverage_area REAL DEFAULT 1000,
        status TEXT DEFAULT 'active',
        last_seen DATETIME,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Emergency units table
      `CREATE TABLE IF NOT EXISTS emergency_units (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'available',
        current_location TEXT,
        base_location TEXT,
        capabilities TEXT,
        contact_info TEXT,
        last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_frame_analysis_camera_time ON frame_analysis(camera_id, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_alerts_severity_time ON alerts(severity, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_emergencies_status_time ON emergencies(status, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_missing_persons_status ON missing_persons(status)',
      'CREATE INDEX IF NOT EXISTS idx_system_logs_level_time ON system_logs(level, timestamp)'
    ];

    // Execute table creation
    for (const table of tables) {
      await this.run(table);
    }

    // Execute index creation
    for (const index of indexes) {
      await this.run(index);
    }

    console.log('Database tables and indexes created successfully');
  }

  // Promisify database operations
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Frame analysis operations
  async storeFrameAnalysis(data) {
    const sql = `INSERT INTO frame_analysis 
      (camera_id, people_count, density, velocity, congestion_level, motion_intensity, analysis_data)
      VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
      data.cameraId,
      data.crowdAnalysis?.peopleCount || 0,
      data.crowdAnalysis?.currentMetrics?.density || 0,
      data.crowdAnalysis?.currentMetrics?.velocity || 0,
      data.crowdAnalysis?.currentMetrics?.congestionLevel || 0,
      data.motionAnalysis?.motionIntensity || 0,
      JSON.stringify(data)
    ];

    return await this.run(sql, params);
  }

  async getCrowdData(options = {}) {
    let sql = 'SELECT * FROM frame_analysis';
    const params = [];

    if (options.since) {
      sql += ' WHERE timestamp > ?';
      params.push(options.since.toISOString());
    }

    sql += ' ORDER BY timestamp DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = await this.all(sql, params);
    return rows.map(row => ({
      ...row,
      analysis_data: JSON.parse(row.analysis_data || '{}')
    }));
  }

  // Alert operations
  async storeAlert(alert) {
    const sql = `INSERT INTO alerts 
      (type, severity, message, camera_id, location, confidence)
      VALUES (?, ?, ?, ?, ?, ?)`;
    
    const params = [
      alert.type,
      alert.severity,
      alert.message,
      alert.cameraId,
      alert.location,
      alert.confidence || 0
    ];

    return await this.run(sql, params);
  }

  async getAlerts(options = {}) {
    let sql = 'SELECT * FROM alerts';
    const params = [];

    if (options.since) {
      sql += ' WHERE timestamp > ?';
      params.push(options.since.toISOString());
    }

    sql += ' ORDER BY timestamp DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    return await this.all(sql, params);
  }

  // Emergency operations
  async storeEmergency(emergency) {
    const sql = `INSERT INTO emergencies 
      (id, type, description, location, coordinates, severity, status, reported_by, dispatch_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
      emergency.id,
      emergency.type,
      emergency.description,
      emergency.location,
      JSON.stringify(emergency.coordinates),
      emergency.severity || 'medium',
      emergency.status || 'reported',
      emergency.reportedBy,
      JSON.stringify(emergency.dispatchResult || {})
    ];

    return await this.run(sql, params);
  }

  async updateEmergency(id, updates) {
    const fields = [];
    const params = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'dispatchResult') {
        fields.push('dispatch_data = ?');
        params.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    });

    params.push(id);
    const sql = `UPDATE emergencies SET ${fields.join(', ')} WHERE id = ?`;
    
    return await this.run(sql, params);
  }

  async getEmergencies(options = {}) {
    let sql = 'SELECT * FROM emergencies';
    const params = [];

    if (options.since) {
      sql += ' WHERE timestamp > ?';
      params.push(options.since.toISOString());
    }

    sql += ' ORDER BY timestamp DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = await this.all(sql, params);
    return rows.map(row => ({
      ...row,
      coordinates: JSON.parse(row.coordinates || '{}'),
      dispatch_data: JSON.parse(row.dispatch_data || '{}')
    }));
  }

  // Missing person operations
  async storeMissingPerson(person) {
    const sql = `INSERT INTO missing_persons 
      (id, description, last_known_location, contact_info, facial_features, reported_by, matches_data)
      VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
      person.id,
      person.description,
      person.lastKnownLocation,
      JSON.stringify(person.contactInfo),
      JSON.stringify(person.searchResult?.facialFeatures || {}),
      person.reportedBy,
      JSON.stringify(person.searchResult?.matches || [])
    ];

    return await this.run(sql, params);
  }

  // Summary operations
  async storeSummary(summary) {
    const sql = `INSERT INTO summaries 
      (query, summary_data, context_data, confidence, data_sources, processing_time)
      VALUES (?, ?, ?, ?, ?, ?)`;
    
    const params = [
      summary.query,
      JSON.stringify(summary.summary),
      JSON.stringify(summary.context || {}),
      summary.confidence || 0,
      JSON.stringify(summary.dataSourcesUsed || []),
      summary.processingTime || 0
    ];

    return await this.run(sql, params);
  }

  // Utility methods
  async getSentimentData(options = {}) {
    // For now, return empty array as sentiment is processed in real-time
    // In future versions, we could store sentiment history
    return [];
  }

  async logMessage(level, message, component = null, metadata = null) {
    const sql = `INSERT INTO system_logs (level, message, component, metadata)
      VALUES (?, ?, ?, ?)`;
    
    const params = [
      level,
      message,
      component,
      JSON.stringify(metadata)
    ];

    return await this.run(sql, params);
  }

  async cleanup(daysToKeep = 7) {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const tables = ['frame_analysis', 'system_logs'];
    
    for (const table of tables) {
      const sql = `DELETE FROM ${table} WHERE timestamp < ?`;
      await this.run(sql, [cutoff.toISOString()]);
    }
    
    console.log(`Cleaned up data older than ${daysToKeep} days`);
  }

  isConnected() {
    return this.connected;
  }

  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) console.error('Error closing database:', err);
          else console.log('Database connection closed');
          this.connected = false;
          resolve();
        });
      });
    }
  }
}

module.exports = Database;
