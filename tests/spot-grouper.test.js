/**
 * Unit tests for Spot Grouping & Haversine Distance
 */
import { calculateDistance, getTimeOfDayBucket, groupSessionsIntoSpots, getBestPlaceRightNow } from '../js/spot-grouper.js';

export function runSpotGrouperTests() {
  console.log('==> Running Spot Grouper Unit Tests...');

  // Test 1: Haversine distance math
  // San Francisco points approx 100 meters apart
  const d1 = calculateDistance(37.7749, -122.4194, 37.7755, -122.4194);
  console.assert(d1 > 50 && d1 < 100, `Expected distance ~66 meters, got ${d1}`);

  // Far apart points (~10 km)
  const d2 = calculateDistance(37.7749, -122.4194, 37.8500, -122.4194);
  console.assert(d2 > 8000, `Expected distance > 8km, got ${d2}`);

  // Test 2: Time of day bucket classifier
  const dawnDate = new Date('2026-10-08T06:15:00');
  console.assert(getTimeOfDayBucket(dawnDate) === 'dawn', `Expected 'dawn', got ${getTimeOfDayBucket(dawnDate)}`);

  const duskDate = new Date('2026-10-08T18:30:00');
  console.assert(getTimeOfDayBucket(duskDate) === 'dusk', `Expected 'dusk', got ${getTimeOfDayBucket(duskDate)}`);

  // Test 3: Spot Clustering (< 150m distance)
  const mockSessions = [
    {
      id: 's1',
      spotName: '',
      lat: 37.7749,
      lng: -122.4194,
      natureScore: 90,
      timestamp: '2026-10-08T06:30:00Z',
      timeOfDay: 'dawn',
      topClasses: [{ name: 'Bird', percentage: 50 }]
    },
    {
      id: 's2',
      spotName: '',
      lat: 37.7751, // ~20m away from s1
      lng: -122.4194,
      natureScore: 94,
      timestamp: '2026-10-08T06:45:00Z',
      timeOfDay: 'dawn',
      topClasses: [{ name: 'Bird', percentage: 60 }]
    },
    {
      id: 's3',
      spotName: 'Far Park',
      lat: 37.8800, // > 10km away
      lng: -122.5000,
      natureScore: 40,
      timestamp: '2026-10-08T12:00:00Z',
      timeOfDay: 'midday',
      topClasses: [{ name: 'Car', percentage: 70 }]
    }
  ];

  const spots = groupSessionsIntoSpots(mockSessions);
  console.assert(spots.length === 2, `Expected 2 clustered spots, got ${spots.length}`);
  console.assert(spots[0].sessionCount === 2, `Expected spot 1 to contain 2 grouped sessions`);
  console.assert(spots[0].avgNatureScore === 92, `Expected avg Nature Score 92, got ${spots[0].avgNatureScore}`);

  // Test 4: Recommendation Engine
  const recommendation = getBestPlaceRightNow(spots, 37.7749, -122.4194, dawnDate);
  console.assert(recommendation !== null, `Expected recommendation object`);
  console.assert(recommendation.scoreForBucket === 92, `Expected recommended score 92, got ${recommendation.scoreForBucket}`);

  console.log('✓ All Spot Grouper tests passed successfully!');
}
