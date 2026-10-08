/**
 * Acoustic Atlas - Main Controller Application Module
 * Wires together Audio Processor, Classifier, Scorer, IndexedDB, Spot Grouper, Map, and UI.
 */

import { db } from './db.js';
import { audioProcessor } from './audio-processor.js';
import { classifier } from './classifier.js';
import { computeSessionScore } from './scorer.js';
import { groupSessionsIntoSpots, getBestPlaceRightNow, getTimeOfDayBucket } from './spot-grouper.js';
import { loadDemoDataIntoDB } from './demo-data.js';
import { MapRenderer } from './map.js';
import { ui } from './ui.js';

class App {
  constructor() {
    this.sessionTimer = null;
    this.sessionSecondsRemaining = 0;
    this.currentSessionData = null;
    this.wakeLock = null;
    this.mapRenderer = null;
    this.isDemoMode = false;
  }

  async init() {
    console.log('==> Initializing Acoustic Atlas PWA...');

    // Register Service Worker for offline capability
    this.registerServiceWorker();

    // Initialize Map Renderer
    const canvas = document.getElementById('atlas-canvas');
    const leafletContainer = document.getElementById('leaflet-map');
    this.mapRenderer = new MapRenderer(canvas, leafletContainer);

    // Bind UI Listeners
    this.bindEvents();

    // Initialize Classifier in background
    classifier.init().catch(err => console.warn('Classifier init warning:', err));

    // Load initial Atlas view
    await this.refreshAtlasView();
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('ServiceWorker registered:', reg.scope))
        .catch(err => console.warn('ServiceWorker registration failed:', err));
    }
  }

  bindEvents() {
    // Navigation Tabs
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabId = e.currentTarget.dataset.tab;
        ui.switchTab(tabId);
        if (tabId === 'atlas') {
          this.refreshAtlasView();
        }
      });
    });

    // Duration buttons
    document.querySelectorAll('.duration-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
      });
    });

    // Start Listen Session
    const startBtn = document.getElementById('start-listen-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startListenSession());
    }

    // Cancel Session
    const cancelBtn = document.getElementById('cancel-session-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.stopListenSession(true));
    }

    // Demo Mode Toggle
    const demoToggle = document.getElementById('demo-mode-toggle');
    if (demoToggle) {
      demoToggle.addEventListener('change', async (e) => {
        this.isDemoMode = e.target.checked;
        if (this.isDemoMode) {
          await loadDemoDataIntoDB(db);
          alert('Demo mode enabled: Sample listening spots loaded into Atlas.');
        } else {
          await db.clearAllData();
          alert('Demo mode disabled: Sample data cleared.');
        }
        await this.refreshAtlasView();
      });
    }

    // Privacy & Data Management Buttons
    const deleteBtn = document.getElementById('delete-all-data-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete all saved listening sessions? This cannot be undone.')) {
          await db.clearAllData();
          await this.refreshAtlasView();
          alert('All data deleted successfully.');
        }
      });
    }

    const exportBtn = document.getElementById('export-json-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        const json = await db.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `acoustic_atlas_export_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    const importInput = document.getElementById('import-json-input');
    if (importInput) {
      importInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        try {
          const count = await db.importJSON(text);
          alert(`Successfully imported ${count} listening sessions!`);
          await this.refreshAtlasView();
        } catch (err) {
          alert(`Import failed: ${err.message}`);
        }
      });
    }
  }

  async startListenSession() {
    const selectedDurationBtn = document.querySelector('.duration-btn.active');
    const durationMinutes = parseFloat(selectedDurationBtn?.dataset.duration || '3');
    const spotNameInput = document.getElementById('spot-name-input');
    const spotName = spotNameInput ? spotNameInput.value.trim() : '';

    const errorNotice = document.getElementById('listen-error-notice');
    if (errorNotice) errorNotice.classList.add('hidden');

    try {
      // 1. Request GPS location (graceful fallback if denied)
      const location = await this.getGPSLocation();

      // 2. Request Wake Lock if available
      await this.requestWakeLock();

      // 3. Initialize Session State
      this.currentSessionData = {
        id: `session_${Date.now()}`,
        spotName: spotName || (location ? `Spot near (${location.lat.toFixed(3)}, ${location.lng.toFixed(3)})` : 'Outdoor Spot'),
        lat: location ? location.lat : null,
        lng: location ? location.lng : null,
        timestamp: new Date().toISOString(),
        timeOfDay: getTimeOfDayBucket(new Date()),
        durationMinutes,
        predictions: [],
        rmsEnergies: []
      };

      // 4. Start Audio Processor
      await audioProcessor.startRecording(
        (windowSamples, windowRms) => this.handleAudioWindow(windowSamples, windowRms),
        (liveRms) => ui.updateAudioMeter(liveRms)
      );

      // 5. Switch to dark pocket screen & start timer
      ui.showPocketScreen(durationMinutes, spotName);
      this.sessionSecondsRemaining = Math.round(durationMinutes * 60);
      ui.updatePocketCountdown(this.sessionSecondsRemaining);

      this.sessionTimer = setInterval(() => {
        this.sessionSecondsRemaining--;
        ui.updatePocketCountdown(this.sessionSecondsRemaining);

        if (this.sessionSecondsRemaining <= 0) {
          this.stopListenSession(false);
        }
      }, 1000);

    } catch (err) {
      console.error('Failed to start session:', err);
      if (errorNotice) {
        errorNotice.textContent = `Error: ${err.message}`;
        errorNotice.classList.remove('hidden');
      }
    }
  }

  async handleAudioWindow(samplesFloat32, windowRms) {
    if (!this.currentSessionData) return;

    try {
      // Classify ~0.96s audio window
      const probs = await classifier.classifyWindow(samplesFloat32);
      this.currentSessionData.predictions.push(probs);
      this.currentSessionData.rmsEnergies.push(windowRms);
    } catch (e) {
      console.warn('Window classification error:', e);
    }
  }

  async stopListenSession(cancelled = false) {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }

    audioProcessor.stopRecording();
    this.releaseWakeLock();
    ui.hidePocketScreen();

    if (cancelled || !this.currentSessionData) {
      this.currentSessionData = null;
      return;
    }

    // 1. Play haptic vibration & soft completion chime
    this.triggerCompletionFeedback();

    // 2. Calculate Final Nature Score & metrics
    const classGroups = classifier.classGroups || { NATURE: [], HUMAN_NOISE: [], BIRD_CLASSES: [] };
    const classMap = classifier.classMap || [];

    const scoreResults = computeSessionScore(
      this.currentSessionData.predictions,
      classGroups,
      classMap,
      this.currentSessionData.rmsEnergies
    );

    const savedSession = {
      id: this.currentSessionData.id,
      spotName: this.currentSessionData.spotName,
      lat: this.currentSessionData.lat,
      lng: this.currentSessionData.lng,
      timestamp: this.currentSessionData.timestamp,
      timeOfDay: this.currentSessionData.timeOfDay,
      durationMinutes: this.currentSessionData.durationMinutes,
      natureScore: scoreResults.natureScore,
      birdsongShare: scoreResults.birdsongShare,
      humanNoiseShare: scoreResults.humanNoiseShare,
      isQuiet: scoreResults.isQuiet,
      isWindy: scoreResults.isWindy,
      topClasses: scoreResults.topClasses,
      rawStats: scoreResults.rawStats
    };

    // 3. Save session to IndexedDB
    await db.saveSession(savedSession);

    // 4. Render session result
    const resultContainer = document.getElementById('session-result-container');
    ui.renderSessionResult(resultContainer, savedSession);

    this.currentSessionData = null;

    // Refresh Atlas
    await this.refreshAtlasView();
  }

  async refreshAtlasView() {
    const sessions = await db.getAllSessions();
    const spots = groupSessionsIntoSpots(sessions);

    // Render Spot Cards
    const spotsContainer = document.getElementById('atlas-spots-list');
    ui.renderAtlasSpots(spotsContainer, spots);

    // Render Recommendation Box
    const currentLoc = await this.getGPSLocation().catch(() => null);
    const recommendation = getBestPlaceRightNow(spots, currentLoc?.lat, currentLoc?.lng);
    const recContainer = document.getElementById('recommendation-container');
    ui.renderRecommendationCard(recContainer, recommendation);

    // Render Canvas & Leaflet Map
    if (this.mapRenderer) {
      this.mapRenderer.renderOfflineCanvas(spots);
      this.mapRenderer.tryLoadLeaflet(spots);
    }
  }

  async getGPSLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          console.warn('GPS location access denied or offline:', err.message);
          resolve(null);
        },
        { timeout: 5000, maximumAge: 60000 }
      );
    });
  }

  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock request failed:', err.message);
      }
    }
  }

  releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
  }

  triggerCompletionFeedback() {
    // Micro-vibration
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    // Web Audio Soft Chime Synth
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtxClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.3); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.6); // G5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.warn('Audio chime playback omitted:', e);
    }
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
