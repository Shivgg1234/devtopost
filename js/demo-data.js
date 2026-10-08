/**
 * Acoustic Atlas - Demo Data Generator
 * Provides sample listening sessions for instant reviewer evaluation of the Atlas.
 */

export const SAMPLE_SESSIONS = [
  {
    id: 'demo_session_1',
    spotName: 'Pine Needle Woodland Trail',
    lat: 37.7749,
    lng: -122.4194,
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    timeOfDay: 'dusk',
    durationMinutes: 5,
    natureScore: 92,
    birdsongShare: 84,
    humanNoiseShare: 8,
    isQuiet: false,
    isWindy: false,
    topClasses: [
      { name: 'Bird vocalization, bird control, bird call', percentage: 48 },
      { name: 'Rustling leaves', percentage: 22 },
      { name: 'Chirp, tweet', percentage: 18 },
      { name: 'Wind', percentage: 8 },
      { name: 'Cricket', percentage: 4 }
    ],
    rawStats: { meanNature: 0.78, meanHuman: 0.07, windowCount: 300 }
  },
  {
    id: 'demo_session_2',
    spotName: 'Pine Needle Woodland Trail',
    lat: 37.7751,
    lng: -122.4192,
    timestamp: new Date(Date.now() - 3600000 * 14).toISOString(), // Dawn session
    timeOfDay: 'dawn',
    durationMinutes: 3,
    natureScore: 96,
    birdsongShare: 91,
    humanNoiseShare: 4,
    isQuiet: false,
    isWindy: false,
    topClasses: [
      { name: 'Bird', percentage: 52 },
      { name: 'Chirp, tweet', percentage: 28 },
      { name: 'Owl', percentage: 12 },
      { name: 'Wind', percentage: 5 },
      { name: 'Cricket', percentage: 3 }
    ],
    rawStats: { meanNature: 0.85, meanHuman: 0.04, windowCount: 180 }
  },
  {
    id: 'demo_session_3',
    spotName: 'Riverbank Willow Bend',
    lat: 37.7833,
    lng: -122.4167,
    timestamp: new Date(Date.now() - 3600000 * 6).toISOString(), // Midday
    timeOfDay: 'midday',
    durationMinutes: 5,
    natureScore: 88,
    birdsongShare: 62,
    humanNoiseShare: 12,
    isQuiet: false,
    isWindy: false,
    topClasses: [
      { name: 'Stream', percentage: 40 },
      { name: 'Waterfall', percentage: 25 },
      { name: 'Bird vocalization, bird call', percentage: 18 },
      { name: 'Rustling leaves', percentage: 10 },
      { name: 'Water', percentage: 7 }
    ],
    rawStats: { meanNature: 0.72, meanHuman: 0.10, windowCount: 300 }
  },
  {
    id: 'demo_session_4',
    spotName: 'Central Plaza Fountain',
    lat: 37.7880,
    lng: -122.4075,
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), // Afternoon
    timeOfDay: 'afternoon',
    durationMinutes: 5,
    natureScore: 38,
    birdsongShare: 15,
    humanNoiseShare: 62,
    isQuiet: false,
    isWindy: false,
    topClasses: [
      { name: 'Traffic noise, roadway noise', percentage: 35 },
      { name: 'Car passing by', percentage: 24 },
      { name: 'Water', percentage: 18 },
      { name: 'Conversation', percentage: 15 },
      { name: 'Bus', percentage: 8 }
    ],
    rawStats: { meanNature: 0.28, meanHuman: 0.46, windowCount: 300 }
  },
  {
    id: 'demo_session_5',
    spotName: 'Suburban Garden Courtyard',
    lat: 37.7650,
    lng: -122.4300,
    timestamp: new Date(Date.now() - 3600000 * 26).toISOString(), // Yesterday Morning
    timeOfDay: 'morning',
    durationMinutes: 10,
    natureScore: 82,
    birdsongShare: 75,
    humanNoiseShare: 18,
    isQuiet: false,
    isWindy: false,
    topClasses: [
      { name: 'Chirp, tweet', percentage: 44 },
      { name: 'Bird', percentage: 26 },
      { name: 'Car passing by', percentage: 14 },
      { name: 'Rustling leaves', percentage: 10 },
      { name: 'Wind', percentage: 6 }
    ],
    rawStats: { meanNature: 0.68, meanHuman: 0.15, windowCount: 600 }
  },
  {
    id: 'demo_session_6',
    spotName: 'Suburban Garden Courtyard',
    lat: 37.7652,
    lng: -122.4301,
    timestamp: new Date(Date.now() - 3600000 * 22).toISOString(), // Night
    timeOfDay: 'night',
    durationMinutes: 5,
    natureScore: 94,
    birdsongShare: 10,
    humanNoiseShare: 6,
    isQuiet: false,
    isWindy: false,
    topClasses: [
      { name: 'Cricket', percentage: 65 },
      { name: 'Insect', percentage: 20 },
      { name: 'Wind noise (microphone)', percentage: 8 },
      { name: 'Frog', percentage: 5 },
      { name: 'Car passing by', percentage: 2 }
    ],
    rawStats: { meanNature: 0.81, meanHuman: 0.05, windowCount: 300 }
  }
];

export async function loadDemoDataIntoDB(dbInstance) {
  for (const session of SAMPLE_SESSIONS) {
    await dbInstance.saveSession(session);
  }
  return SAMPLE_SESSIONS.length;
}
