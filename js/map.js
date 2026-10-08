/**
 * Acoustic Atlas - Offline Canvas & Optional Leaflet Map Renderer
 * Renders spot coordinates on an offline Canvas scatter plot,
 * with optional dynamic Leaflet tile layer when connected online.
 */

export class MapRenderer {
  constructor(canvasElement, leafletContainer) {
    this.canvas = canvasElement;
    this.leafletContainer = leafletContainer;
    this.leafletMap = null;
  }

  renderOfflineCanvas(spots) {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext('2d');
    const width = this.canvas.clientWidth || 300;
    const height = this.canvas.clientHeight || 240;

    this.canvas.width = width;
    this.canvas.height = height;

    // Background gradient grid
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const validSpots = spots.filter(s => s.lat != null && s.lng != null);
    if (validSpots.length === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No GPS coordinates recorded yet', width / 2, height / 2);
      return;
    }

    // Determine bounding box
    let minLat = Math.min(...validSpots.map(s => s.lat));
    let maxLat = Math.max(...validSpots.map(s => s.lat));
    let minLng = Math.min(...validSpots.map(s => s.lng));
    let maxLng = Math.max(...validSpots.map(s => s.lng));

    // Pad bounding box
    const padLat = (maxLat - minLat) * 0.2 || 0.01;
    const padLng = (maxLng - minLng) * 0.2 || 0.01;
    minLat -= padLat; maxLat += padLat;
    minLng -= padLng; maxLng += padLng;

    // Plot spots
    validSpots.forEach(spot => {
      const x = ((spot.lng - minLng) / (maxLng - minLng)) * (width - 40) + 20;
      const y = height - (((spot.lat - minLat) / (maxLat - minLat)) * (height - 40) + 20);

      // Color coding based on Nature Score
      let color = '#22c55e'; // High nature green
      if (spot.avgNatureScore < 50) color = '#ef4444'; // Red
      else if (spot.avgNatureScore < 75) color = '#eab308'; // Amber

      // Outer glow pulse
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.2;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Solid point
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#f3f4f6';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${spot.spotName} (${spot.avgNatureScore}%)`, x, y - 10);
    });
  }

  async tryLoadLeaflet(spots) {
    if (!navigator.onLine || !this.leafletContainer) {
      if (this.leafletContainer) this.leafletContainer.style.display = 'none';
      return;
    }

    try {
      if (!window.L) {
        // Dynamic injection of Leaflet JS & CSS
        await this.injectScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
        await this.injectStylesheet('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
      }

      if (!window.L) return;

      this.leafletContainer.style.display = 'block';
      if (!this.leafletMap) {
        this.leafletMap = window.L.map(this.leafletContainer).setView([37.7749, -122.4194], 12);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.leafletMap);
      }

      const validSpots = spots.filter(s => s.lat != null && s.lng != null);
      if (validSpots.length > 0) {
        const bounds = [];
        validSpots.forEach(s => {
          bounds.push([s.lat, s.lng]);
          window.L.circleMarker([s.lat, s.lng], {
            radius: 8,
            fillColor: s.avgNatureScore >= 75 ? '#22c55e' : (s.avgNatureScore >= 50 ? '#eab308' : '#ef4444'),
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          }).addTo(this.leafletMap).bindPopup(`<b>${s.spotName}</b><br>Nature Score: ${s.avgNatureScore}%`);
        });

        this.leafletMap.fitBounds(bounds, { padding: [30, 30] });
      }
    } catch (e) {
      console.warn('Leaflet map layer unavailable or offline:', e.message);
      if (this.leafletContainer) this.leafletContainer.style.display = 'none';
    }
  }

  injectScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  injectStylesheet(href) {
    return new Promise((resolve, reject) => {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.onload = resolve;
      l.onerror = reject;
      document.head.appendChild(l);
    });
  }
}
