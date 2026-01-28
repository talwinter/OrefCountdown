const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

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

// Load cities-geo data (for geolocation lookup)
const citiesGeoPath = path.join(__dirname, '..', 'data', 'cities-geo.json');
const citiesGeo = JSON.parse(fs.readFileSync(citiesGeoPath, 'utf8'));

// Create a map for quick lookup
const areaTimeMap = new Map();
areas.forEach(area => {
  areaTimeMap.set(area.name, area.migun_time);
});

// In-memory storage for current alerts
let currentAlerts = new Map(); // area -> { area, migun_time, started_at, type, instructions }
let testAlerts = new Map(); // For test alerts
let currentNewsFlash = null; // { type, instructions, timestamp, areas }

// Oref API configuration
const OREF_ALERTS_URL = 'https://www.oref.org.il/WarningMessages/alert/alerts.json';
const OREF_HISTORY_URL = 'https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json';
const POLL_INTERVAL = 2000; // 2 seconds

// Alert category mappings (from pikud-haoref-api)
// Regular alerts (alerts.json)
const ALERT_CATEGORIES = {
  1: 'missiles',
  2: 'general',
  3: 'earthQuake',
  4: 'radiologicalEvent',
  5: 'tsunami',
  6: 'hostileAircraftIntrusion',
  7: 'hazardousMaterials',
  10: 'newsFlash',
  13: 'terroristInfiltration',
  101: 'missilesDrill',
  102: 'generalDrill',
  103: 'earthQuakeDrill',
  104: 'radiologicalEventDrill',
  105: 'tsunamiDrill',
  106: 'hostileAircraftIntrusionDrill',
  107: 'hazardousMaterialsDrill',
  113: 'terroristInfiltrationDrill'
};

// Historical alerts (AlertsHistory.json) have different category numbers
const HISTORICAL_CATEGORIES = {
  1: 'missiles',
  2: 'hostileAircraftIntrusion',
  3: 'general', 4: 'general', 5: 'general', 6: 'general',
  7: 'earthQuake', 8: 'earthQuake',
  9: 'radiologicalEvent',
  10: 'terroristInfiltration',
  11: 'tsunami',
  12: 'hazardousMaterials',
  13: 'newsFlash', 14: 'newsFlash',
  15: 'missilesDrill',
  16: 'hostileAircraftIntrusionDrill',
  17: 'generalDrill', 18: 'generalDrill', 19: 'generalDrill', 20: 'generalDrill',
  21: 'earthQuakeDrill', 22: 'earthQuakeDrill',
  23: 'radiologicalEventDrill',
  24: 'terroristInfiltrationDrill',
  25: 'tsunamiDrill',
  26: 'hazardousMaterialsDrill'
};

// Fetch from a URL with standard Oref headers
async function fetchOrefUrl(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://www.oref.org.il/',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 5000
    });

    if (!response.ok) {
      console.error(`Oref API returned status: ${response.status} for ${url}`);
      return null;
    }

    const text = await response.text();

    // Handle empty response (no alerts)
    if (!text || text.trim() === '') {
      return null;
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
    console.error(`Error fetching ${url}:`, error.message);
    return null;
  }
}

// Fetch alerts from main Oref API
async function fetchOrefAlerts() {
  return await fetchOrefUrl(OREF_ALERTS_URL);
}

// Fetch alerts history (contains newsFlash with different category numbers)
async function fetchOrefHistory() {
  return await fetchOrefUrl(OREF_HISTORY_URL);
}

// Process alerts from Oref (main alerts.json endpoint)
function processOrefAlerts(orefData) {
  if (!orefData) {
    return;
  }

  const now = Date.now();
  const activeAreas = new Set();

  // Determine alert type and areas from the response
  // The API can return either:
  // 1. Object with id, cat, title, data array: { id: "...", cat: 1, title: "...", data: ["area1", "area2"] }
  // 2. Object with just data array: { data: ["area1", "area2"] }

  const category = orefData.cat || 1; // Default to missiles if not specified
  const alertType = ALERT_CATEGORIES[category] || 'unknown';
  const instructions = orefData.title || null;
  const areas = orefData.data || [];

  // Handle newsFlash alerts separately
  if (alertType === 'newsFlash') {
    currentNewsFlash = {
      type: 'newsFlash',
      instructions: instructions,
      timestamp: now,
      areas: areas.filter(a => typeof a === 'string' && !a.includes('בדיקה'))
    };
    console.log(`NewsFlash received: ${instructions || 'No instructions'}`);
    return; // newsFlash doesn't have migun time countdown
  }

  // Process regular alerts (missiles, etc.)
  for (const areaName of areas) {
    if (typeof areaName !== 'string') {
      continue;
    }

    // Skip test alerts
    if (areaName.includes('בדיקה')) {
      continue;
    }

    activeAreas.add(areaName);

    // If this is a new alert for this area, record the start time
    if (!currentAlerts.has(areaName)) {
      const migunTime = areaTimeMap.get(areaName) || 90; // Default to 90 seconds
      currentAlerts.set(areaName, {
        area: areaName,
        migun_time: migunTime,
        started_at: now,
        type: alertType,
        instructions: instructions
      });
      console.log(`New ${alertType} alert for: ${areaName} (${migunTime}s)`);
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

// Process alerts from history endpoint (AlertsHistory.json)
function processOrefHistory(historyData) {
  if (!historyData || !Array.isArray(historyData)) {
    return;
  }

  const now = Date.now();

  for (const alert of historyData) {
    // Skip alerts older than 120 seconds
    const alertTime = new Date(alert.alertDate).getTime();
    if (now - alertTime > 120000) {
      continue;
    }

    const category = alert.category;
    const alertType = HISTORICAL_CATEGORIES[category] || 'unknown';
    const areaName = alert.data;
    const instructions = alert.title || null;

    // Skip test alerts
    if (typeof areaName === 'string' && areaName.includes('בדיקה')) {
      continue;
    }

    // Handle newsFlash from history
    if (alertType === 'newsFlash') {
      // Only update if newer than current
      if (!currentNewsFlash || alertTime > currentNewsFlash.timestamp) {
        currentNewsFlash = {
          type: 'newsFlash',
          instructions: instructions,
          timestamp: alertTime,
          areas: typeof areaName === 'string' ? [areaName] : []
        };
        console.log(`NewsFlash from history: ${instructions || 'No instructions'}`);
      }
      continue;
    }

    // Process as regular alert if it's a missile/threat alert
    if (alertType === 'missiles' || alertType === 'hostileAircraftIntrusion' || alertType === 'terroristInfiltration') {
      if (typeof areaName === 'string' && !currentAlerts.has(areaName)) {
        const migunTime = areaTimeMap.get(areaName) || 90;
        currentAlerts.set(areaName, {
          area: areaName,
          migun_time: migunTime,
          started_at: alertTime,
          type: alertType,
          instructions: instructions
        });
        console.log(`New ${alertType} alert from history for: ${areaName} (${migunTime}s)`);
      }
    }
  }

  // Clear old newsFlash (older than 10 minutes)
  if (currentNewsFlash && (now - currentNewsFlash.timestamp) > 600000) {
    currentNewsFlash = null;
  }
}

// Start polling
async function startPolling() {
  console.log('Starting Oref alert polling...');

  // Initial fetch from both endpoints
  const [alertsData, historyData] = await Promise.all([
    fetchOrefAlerts(),
    fetchOrefHistory()
  ]);

  if (alertsData) {
    processOrefAlerts(alertsData);
  }
  if (historyData) {
    processOrefHistory(historyData);
  }

  // Continue polling main alerts frequently
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

  // Poll history less frequently (every 10 seconds) for newsFlash
  setInterval(async () => {
    const data = await fetchOrefHistory();
    if (data) {
      processOrefHistory(data);
    }
  }, 10000);
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

  // Include newsFlash if active (within last 10 minutes)
  let newsFlash = null;
  if (currentNewsFlash && (now - currentNewsFlash.timestamp) <= 600000) {
    newsFlash = currentNewsFlash;
  }

  res.json({
    alerts: activeAlerts,
    newsFlash: newsFlash,
    server_time: now
  });
});

// Get current newsFlash only
app.get('/api/news-flash', (req, res) => {
  const now = Date.now();

  // Return newsFlash if active (within last 10 minutes)
  if (currentNewsFlash && (now - currentNewsFlash.timestamp) <= 600000) {
    res.json({
      active: true,
      newsFlash: currentNewsFlash,
      server_time: now
    });
  } else {
    res.json({
      active: false,
      newsFlash: null,
      server_time: now
    });
  }
});

// Get all areas
app.get('/api/areas', (req, res) => {
  res.json(areas);
});

// Get cities with geo coordinates (for geolocation lookup)
app.get('/api/cities-geo', (req, res) => {
  res.json(citiesGeo);
});

// Development-only test endpoints
// These endpoints are completely disabled in production
if (process.env.NODE_ENV !== 'production') {
  // Test alert endpoint - supports multiple areas
  // Usage: ?areas=area1,area2,area3 OR ?area=single_area
  app.get('/api/test-alert', testAlertLimiter, (req, res) => {
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
    currentNewsFlash = null;
    res.json({ success: true, message: 'Test alerts and newsFlash cleared' });
  });

  // Test newsFlash endpoint
  // Usage: ?instructions=התרעה מוקדמת - איום טילים מאיראן
  app.get('/api/test-news-flash', testAlertLimiter, (req, res) => {
    const instructions = req.query.instructions || 'התרעה מוקדמת - יש להיכנס למרחב מוגן';
    const areas = req.query.areas ? req.query.areas.split(',').map(a => a.trim()) : [];

    currentNewsFlash = {
      type: 'newsFlash',
      instructions: instructions,
      timestamp: Date.now(),
      areas: areas
    };

    console.log(`Test newsFlash created: ${instructions}`);

    res.json({
      success: true,
      newsFlash: currentNewsFlash
    });
  });

  console.log('Development mode: Test endpoints enabled (/api/test-alert, /api/test-news-flash, /api/clear-test-alerts)');
}

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
