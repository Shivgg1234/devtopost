/**
 * Acoustic Atlas - Master Test Runner
 * Executes all unit tests and asserts system correctness.
 */
import { runScorerTests } from './scorer.test.js';
import { runSpotGrouperTests } from './spot-grouper.test.js';

console.log('==========================================');
console.log('  ACOUSTIC ATLAS UNIT TEST SUITE  ');
console.log('==========================================');

try {
  runScorerTests();
  runSpotGrouperTests();
  console.log('\n✅ ALL UNIT TESTS PASSED SUCCESSFULLY!\n');
} catch (err) {
  console.error('\n❌ UNIT TEST FAILURE:', err.message);
  console.error(err.stack);
  process.exit(1);
}
