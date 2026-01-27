const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// API Key for test-alert endpoint (set in environment or use default for dev)
const TEST_ALERT_KEY = process.env.TEST_ALERT_KEY || 'dev-key-not-for-production';

// CORS configuration - allow all origins in dev, restrict in production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || true
    : true,
  methods: ['GET'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting - 100 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 600, // 600 requests per minute (10req/sec) - prevents 429s with 1s polling
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limit for test-alert endpoint
const testAlertLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // Only 10 test alerts per minute
  message: { error: 'Too many test alerts, please try again later.' }
});


// Load areas data
const areasPath = path.join(__dirname, '..', 'data', 'areas.json');
const areas = JSON.parse(fs.readFileSync(areasPath, 'utf8'));

// Create a map for quick lookup
const areaTimeMap = new Map();
areas.forEach(area => {
  areaTimeMap.set(area.name, area.migun_time);
});

// In-memory storage for current alerts
let currentAlerts = new Map(); // area -> { area, migun_time, started_at }
let testAlerts = new Map(); // For test alerts

// Oref API configuration
const OREF_URL = 'https://www.oref.org.il/WarningMessages/alert/alerts.json';
const POLL_INTERVAL = 2000; // 2 seconds

// Fetch alerts from Oref API
async function fetchOrefAlerts() {
  try {
    const response = await fetch(OREF_URL, {
      headers: {
        'Referer': 'https://www.oref.org.il/',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 5000
    });

    if (!response.ok) {
      console.error(`Oref API returned status: ${response.status}`);
      return null;
    }

    const text = await response.text();

    // Handle empty response (no alerts)
    if (!text || text.trim() === '') {
      return { data: [] };
    }

    // Remove BOM if present
    const cleanText = text.replace(/^\uFEFF/, '');

    try {
      return JSON.parse(cleanText);
    } catch (parseError) {
      console.error('Failed to parse Oref response:', parseError.message);
      return null;
    }
  } catch (error) {
    console.error('Error fetching Oref alerts:', error.message);
    return null;
  }
}

// Process alerts from Oref
function processOrefAlerts(orefData) {
  if (!orefData || !orefData.data) {
    return;
  }

  const now = Date.now();
  const activeAreas = new Set();

  // Process new alerts
  for (const alert of orefData.data) {
    // Oref API returns alerts with 'data' array containing area names
    const areaName = alert;

    if (typeof areaName !== 'string') {
      continue;
    }

    activeAreas.add(areaName);

    // If this is a new alert for this area, record the start time
    if (!currentAlerts.has(areaName)) {
      const migunTime = areaTimeMap.get(areaName) || 90; // Default to 90 seconds
      currentAlerts.set(areaName, {
        area: areaName,
        migun_time: migunTime,
        started_at: now
      });
      console.log(`New alert for: ${areaName} (${migunTime}s)`);
    }
  }

  // Remove alerts that are no longer active AND have expired
  for (const [areaName, alertData] of currentAlerts) {
    const elapsed = (now - alertData.started_at) / 1000;
    const expired = elapsed > alertData.migun_time + 30; // Keep for 30 seconds after migun time

    if (!activeAreas.has(areaName) && expired) {
      currentAlerts.delete(areaName);
      console.log(`Alert ended for: ${areaName}`);
    }
  }
}

// Start polling
async function startPolling() {
  console.log('Starting Oref alert polling...');

  // Initial fetch
  const initialData = await fetchOrefAlerts();
  if (initialData) {
    processOrefAlerts(initialData);
  }

  // Continue polling
  setInterval(async () => {
    const data = await fetchOrefAlerts();
    if (data) {
      processOrefAlerts(data);
    }

    // Clean up expired test alerts
    const now = Date.now();
    for (const [areaName, alertData] of testAlerts) {
      const elapsed = (now - alertData.started_at) / 1000;
      if (elapsed > alertData.migun_time + 30) {
        testAlerts.delete(areaName);
      }
    }
  }, POLL_INTERVAL);
}

// API Routes

// Get current alerts
app.get('/api/alerts', (req, res) => {
  const now = Date.now();

  // Combine real alerts and test alerts
  const allAlerts = new Map([...currentAlerts, ...testAlerts]);

  // Filter to only active alerts (within migun time + buffer)
  const activeAlerts = [];
  for (const [areaName, alertData] of allAlerts) {
    const elapsed = (now - alertData.started_at) / 1000;
    if (elapsed <= alertData.migun_time + 30) {
      activeAlerts.push(alertData);
    }
  }

  res.json({
    alerts: activeAlerts,
    server_time: now
  });
});

// Get all areas
app.get('/api/areas', (req, res) => {
  res.json(areas);
});

// Test alert endpoint - supports multiple areas
// Usage: ?areas=area1,area2,area3 OR ?area=single_area
// Requires API key in production: X-API-Key header or ?key= param
app.get('/api/test-alert', testAlertLimiter, (req, res) => {
  const isDev = process.env.NODE_ENV !== 'production';

  // Check API key (header or query param)
  const apiKey = req.headers['x-api-key'] || req.query.key;

  if (!isDev && apiKey !== TEST_ALERT_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  // Support both single area (?area=) and multiple areas (?areas=)
  let areaNames = [];

  if (req.query.areas) {
    // Multiple areas - comma separated
    areaNames = req.query.areas.split(',').map(a => a.trim()).filter(a => a);
  } else if (req.query.area) {
    // Single area (backward compatible)
    areaNames = [req.query.area];
  }

  if (areaNames.length === 0) {
    return res.status(400).json({
      error: 'Area name(s) required. Use ?area=אזור or ?areas=אזור1,אזור2,אזור3'
    });
  }

  const now = Date.now();
  const createdAlerts = [];

  for (const areaName of areaNames) {
    // Query param takes priority for testing, then area map, then default 90
    const queryMigunTime = parseInt(req.query.migun_time);
    const migunTime = !isNaN(queryMigunTime) ? queryMigunTime : (areaTimeMap.get(areaName) || 90);

    testAlerts.set(areaName, {
      area: areaName,
      migun_time: migunTime,
      started_at: now
    });

    createdAlerts.push({
      area: areaName,
      migun_time: migunTime,
      started_at: now
    });

    console.log(`Test alert created for: ${areaName} (${migunTime}s)`);
  }

  res.json({
    success: true,
    count: createdAlerts.length,
    alerts: createdAlerts
  });
});

// Clear test alerts
app.get('/api/clear-test-alerts', (req, res) => {
  testAlerts.clear();
  res.json({ success: true, message: 'Test alerts cleared' });
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

// All other routes return React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startPolling();
});
