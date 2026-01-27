const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

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

// Test alert endpoint
app.get('/api/test-alert', (req, res) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const testParam = req.query.test === 'true';

  if (!isDev && !testParam) {
    return res.status(403).json({ error: 'Test alerts only available in development mode or with ?test=true' });
  }

  const areaName = req.query.area;

  if (!areaName) {
    return res.status(400).json({ error: 'Area name required. Use ?area=אזור' });
  }

  const migunTime = areaTimeMap.get(areaName) || parseInt(req.query.migun_time) || 90;
  const now = Date.now();

  testAlerts.set(areaName, {
    area: areaName,
    migun_time: migunTime,
    started_at: now
  });

  console.log(`Test alert created for: ${areaName} (${migunTime}s)`);

  res.json({
    success: true,
    alert: {
      area: areaName,
      migun_time: migunTime,
      started_at: now
    }
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
