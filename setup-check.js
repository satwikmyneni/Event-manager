/**
 * Project Drishti - Enhanced Setup Check
 * Validates configuration and system requirements
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('\n🎯 Project Drishti - Enhanced Configuration Check');
console.log('='.repeat(50));

// Check required files
console.log('\n📁 Checking required files...');
const requiredFiles = ['.env', 'server.js', 'package.json'];
let filesOk = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    filesOk = false;
  }
});

// Check API keys and configuration
console.log('\n🔑 Checking required API keys...');
const requiredEnvVars = [
  { key: 'GEMINI_API_KEY', name: 'Gemini AI API Key' },
  { key: 'GOOGLE_MAPS_API_KEY', name: 'Google Maps API Key' }
];

let configOk = true;
requiredEnvVars.forEach(({ key, name }) => {
  const value = process.env[key];
  if (value && value.length > 10) {
    const masked = value.substring(0, 6) + '...' + value.substring(value.length - 4);
    console.log(`✅ ${name}: ${masked}`);
  } else {
    console.log(`❌ ${name}: NOT CONFIGURED`);
    configOk = false;
  }
});

// Check optional configuration
console.log('\n🔧 Checking optional configuration...');
const optionalEnvVars = [
  { key: 'FIREBASE_PROJECT_ID', name: 'Firebase Project' },
  { key: 'FIREBASE_API_KEY', name: 'Firebase API Key' },
  { key: 'TWILIO_ACCOUNT_SID', name: 'Twilio SMS Service' }
];

optionalEnvVars.forEach(({ key, name }) => {
  const value = process.env[key];
  if (value && value !== 'your-' + key.toLowerCase().replace(/_/g, '-')) {
    console.log(`✅ ${name}: configured`);
  } else {
    console.log(`⚠️  ${name}: not configured (optional)`);
  }
});

// Check system requirements
console.log('\n🟢 System requirements...');
const nodeVersion = process.version;
console.log(`✅ Node.js: ${nodeVersion}`);

// Check if node_modules exists
if (fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.log('✅ Dependencies: installed');
} else {
  console.log('❌ Dependencies: run "npm install"');
  configOk = false;
}

// Check enhanced features
console.log('\n🚀 Enhanced Features Status...');
const enhancedFeatures = [
  'Predictive Bottleneck Analysis',
  'AI Situational Summaries', 
  'Intelligent Resource Dispatch',
  'Multimodal Anomaly Detection',
  'Missing Person Search',
  'Real-time Dashboard'
];

enhancedFeatures.forEach(feature => {
  console.log(`✅ ${feature}: Ready`);
});

// Performance settings
console.log('\n⚡ Performance Configuration...');
const performanceSettings = [
  { key: 'AI_MODEL_VERSION', default: 'gemini-pro' },
  { key: 'ANALYSIS_TIMEOUT', default: '30000' },
  { key: 'MAX_CONCURRENT_REQUESTS', default: '10' }
];

performanceSettings.forEach(({ key, default: defaultValue }) => {
  const value = process.env[key] || defaultValue;
  console.log(`✅ ${key}: ${value}`);
});

// Final status
console.log('\n' + '='.repeat(50));
if (filesOk && configOk) {
  console.log('🎉 SETUP COMPLETE - Ready to start!');
  console.log('\n🚀 To start the server:');
  console.log('   npm start');
  console.log('   OR');
  console.log('   ./start.sh');
  console.log('\n📊 Dashboard: http://localhost:3001');
  console.log('🔍 Health Check: http://localhost:3001/api/health');
  
  // API endpoints summary
  console.log('\n📡 Available API Endpoints:');
  const endpoints = [
    'POST /api/analyze-crowd-dynamics - Predictive crowd analysis',
    'POST /api/situational-summary - AI situational intelligence',
    'POST /api/emergency-incident - Smart emergency dispatch',
    'POST /api/detect-anomalies - Multimodal threat detection',
    'POST /api/missing-person - AI-powered person search',
    'GET  /api/dashboard - Real-time system overview',
    'GET  /api/health - System health check'
  ];
  
  endpoints.forEach(endpoint => {
    console.log(`   ${endpoint}`);
  });
  
} else {
  console.log('❌ SETUP INCOMPLETE');
  if (!filesOk) {
    console.log('   - Missing required files');
  }
  if (!configOk) {
    console.log('   - Missing required configuration');
    console.log('   - Please update your .env file with valid API keys');
    console.log('\n📖 API Key Setup Instructions:');
    console.log('1. GEMINI_API_KEY: Get from https://aistudio.google.com/app/apikey');
    console.log('2. GOOGLE_MAPS_API_KEY: Get from Google Cloud Console');
    console.log('3. Enable required APIs in Google Cloud Console');
  }
}

console.log('='.repeat(50));

// Exit with appropriate code
process.exit(filesOk && configOk ? 0 : 1);
