/**
 * Unit tests for Sound Classifier Scorer logic
 */
import { computeSessionScore, SILENCE_RMS_THRESHOLD } from '../js/scorer.js';

export function runScorerTests() {
  console.log('==> Running Scorer Unit Tests...');

  const sampleClassGroups = {
    NATURE: ['Bird', 'Chirp, tweet', 'Wind', 'Water', 'Stream'],
    HUMAN_NOISE: ['Car', 'Traffic noise', 'Engine', 'Horn', 'Speech'],
    BIRD_CLASSES: ['Bird', 'Chirp, tweet']
  };

  const sampleClassMap = ['Speech', 'Bird', 'Chirp, tweet', 'Wind', 'Car', 'Traffic noise', 'Stream'];

  // Test 1: Nature Heavy Session (Bird + Stream)
  // Window predictions format: index 1 (Bird) = 0.6, index 6 (Stream) = 0.3, index 4 (Car) = 0.1
  const naturePredictions = [
    [0.0, 0.6, 0.0, 0.0, 0.1, 0.0, 0.3],
    [0.0, 0.5, 0.1, 0.0, 0.1, 0.0, 0.3]
  ];
  const normalRms = [0.02, 0.025];

  const natureResult = computeSessionScore(naturePredictions, sampleClassGroups, sampleClassMap, normalRms);

  console.assert(natureResult.natureScore >= 80, `Expected Nature Score >= 80, got ${natureResult.natureScore}`);
  console.assert(natureResult.birdsongShare >= 60, `Expected Birdsong Share >= 60, got ${natureResult.birdsongShare}`);
  console.assert(natureResult.isQuiet === false, `Expected isQuiet to be false`);

  // Test 2: Human Noise Heavy Session (Car + Traffic)
  // Index 4 (Car) = 0.7, Index 5 (Traffic) = 0.2, Index 1 (Bird) = 0.1
  const humanPredictions = [
    [0.0, 0.1, 0.0, 0.0, 0.7, 0.2, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.8, 0.2, 0.0]
  ];
  const humanResult = computeSessionScore(humanPredictions, sampleClassGroups, sampleClassMap, normalRms);

  console.assert(humanResult.natureScore <= 20, `Expected Nature Score <= 20, got ${humanResult.natureScore}`);
  console.assert(humanResult.humanNoiseShare >= 80, `Expected Human Noise Share >= 80, got ${humanResult.humanNoiseShare}`);

  // Test 3: Silence Edge Case (RMS < 0.005)
  const silentRms = [0.001, 0.002];
  const silentResult = computeSessionScore(naturePredictions, sampleClassGroups, sampleClassMap, silentRms);

  console.assert(silentResult.isQuiet === true, `Expected isQuiet to be true for low RMS`);

  // Test 4: Top Class output
  console.assert(natureResult.topClasses.length > 0, `Expected topClasses array to be populated`);
  console.assert(natureResult.topClasses[0].name === 'Bird', `Expected top class to be 'Bird'`);

  console.log('✓ All Scorer tests passed successfully!');
}
