/**
 * Acoustic Atlas - Spot Grouping & Recommendation Engine
 * Clusters listening sessions into spots based on location proximity (<150m) or spot name,
 * and calculates time-of-day nature scores and recommendations.
 */

// Haversine distance formula returning distance in meters
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getTimeOfDayBucket(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  const hours = date.getHours() + date.getMinutes() / 60;

  if (hours >= 5 && hours < 7) return 'dawn';
  if (hours >= 7 && hours < 11) return 'morning';
  if (hours >= 11 && hours < 14) return 'midday';
  if (hours >= 14 && hours < 17) return 'afternoon';
  if (hours >= 17 && hours < 19.5) return 'dusk';
  return 'night';
}

export const TIME_BUCKETS = ['dawn', 'morning', 'midday', 'afternoon', 'dusk', 'night'];

export const BUCKET_LABELS = {
  dawn: 'Dawn (5am-7am)',
  morning: 'Morning (7am-11am)',
  midday: 'Midday (11am-2pm)',
  afternoon: 'Afternoon (2pm-5pm)',
  dusk: 'Dusk (5pm-7:30pm)',
  night: 'Night (7:30pm-5am)'
};

/**
 * Groups sessions into spots if they are within 150 meters OR share the same name (case-insensitive).
 */
export function groupSessionsIntoSpots(sessions) {
  if (!sessions || sessions.length === 0) return [];

  const spots = [];

  for (const session of sessions) {
    let matchedSpot = null;
    const sessionName = (session.spotName || '').trim().toLowerCase();

    for (const spot of spots) {
      // Name match
      if (sessionName && spot.spotName.toLowerCase() === sessionName) {
        matchedSpot = spot;
        break;
      }

      // Distance match (< 150 meters)
      if (session.lat != null && session.lng != null && spot.lat != null && spot.lng != null) {
        const dist = calculateDistance(session.lat, session.lng, spot.lat, spot.lng);
        if (dist <= 150) {
          matchedSpot = spot;
          break;
        }
      }
    }

    if (matchedSpot) {
      matchedSpot.sessions.push(session);
      // Update coordinates centroid
      if (session.lat != null && session.lng != null) {
        const validCoords = matchedSpot.sessions.filter(s => s.lat != null && s.lng != null);
        matchedSpot.lat = validCoords.reduce((sum, s) => sum + s.lat, 0) / validCoords.length;
        matchedSpot.lng = validCoords.reduce((sum, s) => sum + s.lng, 0) / validCoords.length;
      }
    } else {
      const newSpot = {
        id: `spot_${spots.length + 1}_${Date.now()}`,
        spotName: session.spotName || `Spot near (${(session.lat || 0).toFixed(3)}, ${(session.lng || 0).toFixed(3)})`,
        lat: session.lat ?? null,
        lng: session.lng ?? null,
        sessions: [session]
      };
      spots.push(newSpot);
    }
  }

  // Calculate aggregated stats for each spot
  return spots.map(spot => {
    const totalScore = spot.sessions.reduce((sum, s) => sum + s.natureScore, 0);
    const avgNatureScore = Math.round(totalScore / spot.sessions.length);

    // Group by time of day bucket
    const bucketStats = {};
    TIME_BUCKETS.forEach(b => {
      bucketStats[b] = { count: 0, totalScore: 0, avgScore: 0 };
    });

    spot.sessions.forEach(s => {
      const bucket = s.timeOfDay || getTimeOfDayBucket(s.timestamp);
      if (bucketStats[bucket]) {
        bucketStats[bucket].count += 1;
        bucketStats[bucket].totalScore += s.natureScore;
      }
    });

    let bestBucket = null;
    let maxAvgScore = -1;

    TIME_BUCKETS.forEach(b => {
      if (bucketStats[b].count > 0) {
        bucketStats[b].avgScore = Math.round(bucketStats[b].totalScore / bucketStats[b].count);
        if (bucketStats[b].avgScore > maxAvgScore) {
          maxAvgScore = bucketStats[b].avgScore;
          bestBucket = b;
        }
      }
    });

    // Top sound classes overall for this spot
    const classCountMap = {};
    spot.sessions.forEach(s => {
      (s.topClasses || []).forEach(c => {
        const name = c.name || c.className;
        if (!classCountMap[name]) classCountMap[name] = 0;
        classCountMap[name] += (c.percentage || 1);
      });
    });

    const topClasses = Object.entries(classCountMap)
      .map(([name, sumPct]) => ({ name, percentage: Math.round(sumPct / spot.sessions.length) }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);

    return {
      id: spot.id,
      spotName: spot.spotName,
      lat: spot.lat,
      lng: spot.lng,
      sessionCount: spot.sessions.length,
      avgNatureScore,
      bestBucket: bestBucket || 'midday',
      maxAvgScore: maxAvgScore >= 0 ? maxAvgScore : avgNatureScore,
      bucketStats,
      topClasses,
      sessions: spot.sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    };
  }).sort((a, b) => b.avgNatureScore - a.avgNatureScore);
}

/**
 * Finds the best place right now based on current time-of-day bucket and user location.
 */
export function getBestPlaceRightNow(spots, currentLat = null, currentLng = null, targetDate = new Date()) {
  if (!spots || spots.length === 0) return null;

  const currentBucket = getTimeOfDayBucket(targetDate);

  // Score each spot for recommendation
  const candidates = spots.map(spot => {
    const bucketInfo = spot.bucketStats[currentBucket];
    const scoreForBucket = (bucketInfo && bucketInfo.count > 0) ? bucketInfo.avgScore : spot.avgNatureScore * 0.85;

    let distanceMeters = null;
    if (currentLat != null && currentLng != null && spot.lat != null && spot.lng != null) {
      distanceMeters = calculateDistance(currentLat, currentLng, spot.lat, spot.lng);
    }

    return {
      spot,
      bucket: currentBucket,
      scoreForBucket: Math.round(scoreForBucket),
      hasDataForBucket: bucketInfo && bucketInfo.count > 0,
      distanceMeters
    };
  });

  // Rank by bucket score descending, prioritizing spots with distance if available
  candidates.sort((a, b) => {
    if (b.scoreForBucket !== a.scoreForBucket) {
      return b.scoreForBucket - a.scoreForBucket;
    }
    if (a.distanceMeters != null && b.distanceMeters != null) {
      return a.distanceMeters - b.distanceMeters;
    }
    return 0;
  });

  return candidates[0] || null;
}
