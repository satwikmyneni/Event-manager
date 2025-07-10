/**
 * Main Dashboard Component for Project Drishti
 * Real-time situational awareness interface
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
} from 'chart.js';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

// Firebase configuration (replace with your config)
const firebaseConfig = {
  // Your Firebase config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const functions = getFunctions(app);

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    alerts: [],
    emergencies: [],
    crowdData: [],
    sentimentData: [],
    summary: {}
  });
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [queryInput, setQueryInput] = useState('');
  const [situationalSummary, setSituationalSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Real-time data subscription
  useEffect(() => {
    const unsubscribes = [];

    // Subscribe to alerts
    const alertsQuery = query(
      collection(db, 'alerts'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    unsubscribes.push(
      onSnapshot(alertsQuery, (snapshot) => {
        const alerts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDashboardData(prev => ({ ...prev, alerts }));
      })
    );

    // Subscribe to emergencies
    const emergenciesQuery = query(
      collection(db, 'emergencies'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    unsubscribes.push(
      onSnapshot(emergenciesQuery, (snapshot) => {
        const emergencies = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDashboardData(prev => ({ ...prev, emergencies }));
      })
    );

    // Subscribe to dashboard updates
    const updatesQuery = query(
      collection(db, 'dashboard_updates'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    unsubscribes.push(
      onSnapshot(updatesQuery, (snapshot) => {
        // Process real-time updates
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const update = change.doc.data();
            handleDashboardUpdate(update);
          }
        });
      })
    );

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const handleDashboardUpdate = useCallback((update) => {
    switch (update.type) {
      case 'FRAME_ANALYSIS':
        // Update crowd and sentiment data
        setDashboardData(prev => ({
          ...prev,
          crowdData: [update.data.crowdAnalysis, ...prev.crowdData.slice(0, 99)],
          sentimentData: [update.data.sentimentAnalysis, ...prev.sentimentData.slice(0, 49)]
        }));
        break;
      case 'ALERT':
        // Add new alert
        setDashboardData(prev => ({
          ...prev,
          alerts: [update.data, ...prev.alerts.slice(0, 49)]
        }));
        break;
      default:
        break;
    }
  }, []);

  const generateSituationalSummary = async () => {
    if (!queryInput.trim()) return;

    setLoading(true);
    try {
      const generateSummary = httpsCallable(functions, 'generateSituationalSummary');
      const result = await generateSummary({
        query: queryInput,
        context: {
          location: selectedCamera?.location || 'event area',
          timeRange: 'last 30 minutes'
        }
      });
      setSituationalSummary(result.data);
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-600';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'VERY_POSITIVE': return 'text-green-600';
      case 'POSITIVE': return 'text-green-500';
      case 'NEUTRAL': return 'text-gray-500';
      case 'NEGATIVE': return 'text-red-500';
      case 'VERY_NEGATIVE': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  // Chart data preparation
  const crowdDensityData = {
    labels: dashboardData.crowdData.slice(0, 20).reverse().map((_, i) => `${i * 5}min`),
    datasets: [{
      label: 'Crowd Density',
      data: dashboardData.crowdData.slice(0, 20).reverse().map(d => d.currentMetrics?.density || 0),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4
    }]
  };

  const alertDistributionData = {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [{
      data: [
        dashboardData.alerts.filter(a => a.severity === 'CRITICAL').length,
        dashboardData.alerts.filter(a => a.severity === 'HIGH').length,
        dashboardData.alerts.filter(a => a.severity === 'MEDIUM').length,
        dashboardData.alerts.filter(a => a.severity === 'LOW').length
      ],
      backgroundColor: ['#dc2626', '#ea580c', '#eab308', '#3b82f6']
    }]
  };

  const sentimentTrendData = {
    labels: dashboardData.sentimentData.slice(0, 10).reverse().map((_, i) => `${i * 3}min`),
    datasets: [{
      label: 'Sentiment Score',
      data: dashboardData.sentimentData.slice(0, 10).reverse().map(d => d.sentiment?.score || 0),
      backgroundColor: 'rgba(34, 197, 94, 0.6)'
    }]
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Project Drishti</h1>
              <span className="ml-3 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                LIVE
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Last Update: {new Date().toLocaleTimeString()}
              </div>
              <div className="flex space-x-2">
                <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                  {dashboardData.alerts.filter(a => a.severity === 'CRITICAL').length} Critical
                </span>
                <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                  {dashboardData.emergencies.filter(e => e.status === 'active').length} Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['overview', 'map', 'analytics', 'intelligence'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">A</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Alerts</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.alerts.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">E</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Active Emergencies</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {dashboardData.emergencies.filter(e => e.status === 'active').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">C</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Avg Crowd Density</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(dashboardData.summary.avgCrowdDensity * 100 || 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">S</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Overall Sentiment</p>
                    <p className={`text-2xl font-bold ${getSentimentColor(dashboardData.summary.overallSentiment)}`}>
                      {dashboardData.summary.overallSentiment || 'NEUTRAL'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Alerts</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {dashboardData.alerts.slice(0, 10).map((alert) => (
                  <div key={alert.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)} mr-3`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{alert.type}</p>
                        <p className="text-sm text-gray-500">{alert.message}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{alert.location}</p>
                      <p className="text-xs text-gray-400">
                        {alert.timestamp?.toDate?.()?.toLocaleTimeString() || 'Just now'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Live Event Map</h3>
            <div className="h-96 rounded-lg overflow-hidden">
              <MapContainer
                center={[37.7749, -122.4194]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
                {/* Alert Markers */}
                {dashboardData.alerts.map((alert) => (
                  alert.location?.coordinates && (
                    <Marker
                      key={alert.id}
                      position={[alert.location.coordinates.lat, alert.location.coordinates.lng]}
                    >
                      <Popup>
                        <div>
                          <h4 className="font-bold">{alert.type}</h4>
                          <p>{alert.message}</p>
                          <p className="text-sm text-gray-500">Severity: {alert.severity}</p>
                        </div>
                      </Popup>
                    </Marker>
                  )
                ))}

                {/* Crowd Density Circles */}
                {dashboardData.crowdData.slice(0, 5).map((crowd, index) => (
                  crowd.location && (
                    <Circle
                      key={index}
                      center={[crowd.location.lat, crowd.location.lng]}
                      radius={crowd.currentMetrics?.density * 100 || 50}
                      color={crowd.currentMetrics?.density > 0.8 ? 'red' : 'blue'}
                      fillOpacity={0.3}
                    />
                  )
                ))}
              </MapContainer>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Crowd Density Trend */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Crowd Density Trend</h3>
                <Line data={crowdDensityData} options={{ responsive: true }} />
              </div>

              {/* Alert Distribution */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Distribution</h3>
                <Doughnut data={alertDistributionData} options={{ responsive: true }} />
              </div>

              {/* Sentiment Trend */}
              <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Sentiment Trend</h3>
                <Bar data={sentimentTrendData} options={{ responsive: true }} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'intelligence' && (
          <div className="space-y-6">
            {/* Query Interface */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">AI Situational Intelligence</h3>
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="Ask about the current situation... (e.g., 'Summarize safety issues in West Gate')"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && generateSituationalSummary()}
                />
                <button
                  onClick={generateSituationalSummary}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Analyzing...' : 'Generate Summary'}
                </button>
              </div>
            </div>

            {/* Situational Summary */}
            {situationalSummary && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">AI Analysis Results</h3>
                <div className="space-y-4">
                  {situationalSummary.summary.criticalEvents && (
                    <div>
                      <h4 className="font-medium text-red-600">Critical Events</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 mt-2">
                        {situationalSummary.summary.criticalEvents.map((event, index) => (
                          <li key={index}>{event}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {situationalSummary.summary.suggestedActions && (
                    <div>
                      <h4 className="font-medium text-blue-600">Suggested Actions</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 mt-2">
                        {situationalSummary.summary.suggestedActions.map((action, index) => (
                          <li key={index}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Confidence: {(situationalSummary.confidence * 100).toFixed(1)}% | 
                    Sources: {situationalSummary.dataSourcesUsed.join(', ')}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
