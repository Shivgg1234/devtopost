/**
 * Acoustic Atlas - UI View Component & Template Renderer
 * Handles UI interactions, gauge rendering, session results, spot cards, and dark pocket screen.
 */

import { BUCKET_LABELS } from './spot-grouper.js';

export class UIRenderer {
  constructor() {
    this.currentTab = 'listen';
  }

  switchTab(tabId) {
    this.currentTab = tabId;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const activeTabEl = document.getElementById(`tab-${tabId}`);
    const activeNavBtn = document.getElementById(`nav-${tabId}`);

    if (activeTabEl) activeTabEl.classList.add('active');
    if (activeNavBtn) activeNavBtn.classList.add('active');
  }

  showPocketScreen(durationMinutes, spotName) {
    const pocketScreen = document.getElementById('pocket-screen');
    const pocketSpotLabel = document.getElementById('pocket-spot-label');

    if (pocketSpotLabel) {
      pocketSpotLabel.textContent = spotName ? `Listening at "${spotName}"` : 'Listening outdoors...';
    }

    if (pocketScreen) {
      pocketScreen.classList.remove('hidden');
    }
  }

  hidePocketScreen() {
    const pocketScreen = document.getElementById('pocket-screen');
    if (pocketScreen) {
      pocketScreen.classList.add('hidden');
    }
  }

  updatePocketCountdown(secondsRemaining) {
    const countdownEl = document.getElementById('pocket-countdown');
    if (countdownEl) {
      const mins = Math.floor(secondsRemaining / 60);
      const secs = secondsRemaining % 60;
      countdownEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  updateAudioMeter(rmsLevel) {
    const meterBar = document.getElementById('audio-meter-bar');
    const pocketPulse = document.getElementById('pocket-pulse');
    if (meterBar) {
      const pct = Math.min(100, Math.max(5, rmsLevel * 500));
      meterBar.style.width = `${pct}%`;
    }
    if (pocketPulse) {
      const scale = 1 + Math.min(0.5, rmsLevel * 5);
      pocketPulse.style.transform = `scale(${scale})`;
    }
  }

  renderSessionResult(sessionContainer, session) {
    if (!sessionContainer) return;

    let scoreColorClass = 'score-high';
    if (session.natureScore < 50) scoreColorClass = 'score-low';
    else if (session.natureScore < 75) scoreColorClass = 'score-med';

    const topClassesHTML = (session.topClasses || [])
      .map(c => `<span class="class-pill"><strong class="pill-name">${c.name}</strong> <span class="pill-pct">${c.percentage}%</span></span>`)
      .join('');

    const quietBadge = session.isQuiet ? `<div class="badge badge-info">🤫 Very Quiet Ambient Area</div>` : '';
    const windBadge = session.isWindy ? `<div class="badge badge-warning">💨 Wind Noise Detected</div>` : '';

    sessionContainer.innerHTML = `
      <div class="result-card card glow-border">
        <div class="result-header">
          <div class="spot-title-group">
            <h3>${session.spotName || 'Outdoor Listening Spot'}</h3>
            <div class="timestamp-meta">${new Date(session.timestamp).toLocaleString()} • ${session.durationMinutes} min • ${session.timeOfDay.toUpperCase()}</div>
          </div>
          <div class="score-badge ${scoreColorClass}">
            <span class="score-val">${session.natureScore}</span>
            <span class="score-label">Nature Score</span>
          </div>
        </div>

        ${quietBadge}
        ${windBadge}

        <div class="metric-grid">
          <div class="metric-box">
            <span class="metric-label">Birdsong Share</span>
            <span class="metric-value green">${session.birdsongShare}%</span>
          </div>
          <div class="metric-box">
            <span class="metric-label">Human Noise Share</span>
            <span class="metric-value red">${session.humanNoiseShare}%</span>
          </div>
        </div>

        <div class="classes-section">
          <h4>Top Detected Sound Classes</h4>
          <div class="class-pills-container">
            ${topClassesHTML || '<span class="text-muted">No prominent sound classes identified</span>'}
          </div>
        </div>
      </div>
    `;
  }

  renderAtlasSpots(container, spots) {
    if (!container) return;

    if (!spots || spots.length === 0) {
      container.innerHTML = `
        <div class="empty-state card">
          <div class="empty-icon">🍃</div>
          <h3>Your Acoustic Atlas is Empty</h3>
          <p>Complete your first 3, 5, or 10-minute outdoor listening session on the <strong>Listen</strong> tab or enable <strong>Demo Mode</strong> to populate sample locations.</p>
        </div>
      `;
      return;
    }

    const spotsHTML = spots.map(spot => {
      let scoreColorClass = 'score-high';
      if (spot.avgNatureScore < 50) scoreColorClass = 'score-low';
      else if (spot.avgNatureScore < 75) scoreColorClass = 'score-med';

      const bestBucketLabel = BUCKET_LABELS[spot.bestBucket] || spot.bestBucket;

      // Time of day mini bar chart
      const bucketsHTML = ['dawn', 'morning', 'midday', 'afternoon', 'dusk', 'night'].map(b => {
        const stats = spot.bucketStats[b];
        const hasData = stats && stats.count > 0;
        const heightPct = hasData ? Math.max(12, stats.avgScore) : 4;
        const color = hasData ? (stats.avgScore >= 75 ? '#22c55e' : (stats.avgScore >= 50 ? '#eab308' : '#ef4444')) : '#374151';
        return `
          <div class="bar-col" title="${b}: ${hasData ? stats.avgScore + '% (' + stats.count + ' sessions)' : 'No data'}">
            <div class="bar-fill" style="height: ${heightPct}%; background-color: ${color};"></div>
            <span class="bar-label">${b.substring(0, 1).toUpperCase()}</span>
          </div>
        `;
      }).join('');

      const topClassesHTML = (spot.topClasses || [])
        .slice(0, 3)
        .map(c => `<span class="mini-pill">${c.name} (${c.percentage}%)</span>`)
        .join('');

      return `
        <div class="spot-card card" data-spot-id="${spot.id}">
          <div class="spot-card-header">
            <div>
              <h3 class="spot-name">${spot.spotName}</h3>
              <div class="spot-coords text-muted">
                ${spot.lat != null ? `${spot.lat.toFixed(4)}, ${spot.lng.toFixed(4)} • ` : ''}${spot.sessionCount} session${spot.sessionCount > 1 ? 's' : ''}
              </div>
            </div>
            <div class="spot-score-pill ${scoreColorClass}">
              <span class="score-number">${spot.avgNatureScore}</span>
              <span class="score-suffix">%</span>
            </div>
          </div>

          <div class="best-time-banner">
            ⭐ <strong>Best Time:</strong> ${bestBucketLabel} (${spot.maxAvgScore}% Nature)
          </div>

          <div class="chart-container">
            <div class="chart-title">Nature Score by Time of Day</div>
            <div class="time-bar-chart">
              ${bucketsHTML}
            </div>
          </div>

          <div class="spot-sounds-preview">
            ${topClassesHTML}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = spotsHTML;
  }

  renderRecommendationCard(container, recommendation) {
    if (!container) return;

    if (!recommendation) {
      container.innerHTML = `
        <div class="recommendation-card card text-muted">
          📍 <strong>Best place right now:</strong> No listening data yet. Complete a listening session to discover optimal spots for this time of day.
        </div>
      `;
      return;
    }

    const { spot, bucket, scoreForBucket, distanceMeters } = recommendation;
    const bucketLabel = BUCKET_LABELS[bucket] || bucket;
    const distanceText = distanceMeters != null ? ` (${Math.round(distanceMeters)} m away)` : '';

    container.innerHTML = `
      <div class="recommendation-card card highlight-card">
        <div class="rec-header">
          <span class="rec-badge">✨ Best Spot Right Now</span>
          <span class="rec-time">${bucketLabel}</span>
        </div>
        <div class="rec-body">
          <h3 class="rec-spot-title">${spot.spotName}${distanceText}</h3>
          <p class="rec-score-text">Expected Nature Score: <strong class="green-text">${scoreForBucket}%</strong> based on past listening sessions.</p>
        </div>
      </div>
    `;
  }
}

export const ui = new UIRenderer();
