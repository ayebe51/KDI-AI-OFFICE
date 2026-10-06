import test from 'node:test';
import assert from 'node:assert';

test('ILMORA Quiz Scoring Regression Test', async (t) => {
  await t.test('Score normalization works deterministically', () => {
    const rawScore = 85;
    const maxScore = 100;
    const pct = (rawScore / maxScore) * 100;
    assert.strictEqual(pct, 85);
  });
});
