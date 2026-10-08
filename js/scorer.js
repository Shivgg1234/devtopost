/**
 * Acoustic Atlas - Sound Classifier Scorer
 * Computes Nature Score, Birdsong Share, Human Noise Share, and Top Detected Classes.
 */

export const SILENCE_RMS_THRESHOLD = 0.005;

/**
 * Computes nature score metrics from raw or windowed class probability arrays.
 * 
 * @param {Array<Array<number>>} predictions - Array of window predictions, each containing 521 probability values.
 * @param {Object} classGroups - Object containing NATURE, HUMAN_NOISE, and BIRD_CLASSES arrays.
 * @param {Array<string>} classMap - Array of 521 display name strings mapped by index.
 * @param {Array<number>} rmsEnergies - Array of RMS energy values for each window.
 */
export function computeSessionScore(predictions, classGroups, classMap, rmsEnergies = []) {
  if (!predictions || predictions.length === 0) {
    return {
      natureScore: 0,
      birdsongShare: 0,
      humanNoiseShare: 0,
      isQuiet: true,
      isWindy: false,
      topClasses: [],
      rawStats: { meanNature: 0, meanHuman: 0 }
    };
  }

  const natureClassSet = new Set(classGroups.NATURE || []);
  const humanClassSet = new Set(classGroups.HUMAN_NOISE || []);
  const birdClassSet = new Set(classGroups.BIRD_CLASSES || []);

  let totalNatureProb = 0;
  let totalHumanProb = 0;
  let totalBirdProb = 0;

  // Track per-class accumulated probabilities
  const classTotals = new Array(classMap.length || 521).fill(0);

  // Check silence energy
  const avgRms = rmsEnergies.length > 0
    ? rmsEnergies.reduce((a, b) => a + b, 0) / rmsEnergies.length
    : SILENCE_RMS_THRESHOLD * 2;

  const isQuiet = avgRms < SILENCE_RMS_THRESHOLD;

  for (let f = 0; f < predictions.length; f++) {
    const windowProbs = predictions[f];

    let windowNature = 0;
    let windowHuman = 0;
    let windowBird = 0;

    for (let c = 0; c < windowProbs.length; c++) {
      const prob = windowProbs[c];
      const className = classMap[c] || `Class_${c}`;

      classTotals[c] += prob;

      if (natureClassSet.has(className)) {
        windowNature += prob;
        if (birdClassSet.has(className)) {
          windowBird += prob;
        }
      }

      if (humanClassSet.has(className)) {
        windowHuman += prob;
      }
    }

    totalNatureProb += windowNature;
    totalHumanProb += windowHuman;
    totalBirdProb += windowBird;
  }

  const windowCount = predictions.length;
  const meanNature = totalNatureProb / windowCount;
  const meanHuman = totalHumanProb / windowCount;
  const meanBird = totalBirdProb / windowCount;

  // Compute Nature Score formula: mean(nature) / (mean(nature) + mean(human_noise)) * 100
  let natureScore = 0;
  if (meanNature + meanHuman > 0) {
    natureScore = Math.round((meanNature / (meanNature + meanHuman)) * 100);
  } else if (isQuiet) {
    natureScore = 85; // Default peaceful ambient baseline when very quiet
  }

  // Birdsong share relative to nature sounds
  const birdsongShare = meanNature > 0 ? Math.round((meanBird / meanNature) * 100) : 0;

  // Human noise share relative to total sound budget
  const humanNoiseShare = (meanNature + meanHuman > 0)
    ? Math.round((meanHuman / (meanNature + meanHuman)) * 100)
    : 0;

  // Calculate top 5 classes
  const sortedClasses = classTotals
    .map((totalProb, idx) => ({
      index: idx,
      name: classMap[idx] || `Class_${idx}`,
      avgProb: totalProb / windowCount
    }))
    .sort((a, b) => b.avgProb - a.avgProb);

  const topProbSum = sortedClasses.slice(0, 10).reduce((sum, item) => sum + item.avgProb, 0);

  const topClasses = sortedClasses.slice(0, 5).map(item => ({
    name: item.name,
    percentage: topProbSum > 0 ? Math.round((item.avgProb / topProbSum) * 100) : 0
  }));

  // Detect predominant wind noise
  const topClassName = sortedClasses[0]?.name || '';
  const isWindy = (topClassName.toLowerCase().includes('wind') && (sortedClasses[0]?.avgProb || 0) > 0.35);

  return {
    natureScore: Math.min(100, Math.max(0, natureScore)),
    birdsongShare: Math.min(100, Math.max(0, birdsongShare)),
    humanNoiseShare: Math.min(100, Math.max(0, humanNoiseShare)),
    isQuiet,
    isWindy,
    avgRms,
    topClasses,
    rawStats: {
      meanNature: parseFloat(meanNature.toFixed(4)),
      meanHuman: parseFloat(meanHuman.toFixed(4)),
      windowCount
    }
  };
}
