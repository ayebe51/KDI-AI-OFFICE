// ==========================================================
// fixtures/demo-calc-repo/test/calculator.test.js
// Automated Unit & Regression Tests for Demo Calculator
// ==========================================================

import test from 'node:test';
import assert from 'node:assert';
import { Calculator } from '../src/calculator.js';

test('Calculator: Core Arithmetic Operations', async (t) => {
  const calc = new Calculator();

  await t.test('adds numbers correctly', () => {
    assert.strictEqual(calc.add(2, 3), 5);
    assert.strictEqual(calc.add(-1, 1), 0);
  });

  await t.test('subtracts numbers correctly', () => {
    assert.strictEqual(calc.subtract(10, 4), 6);
  });

  await t.test('multiplies numbers correctly', () => {
    assert.strictEqual(calc.multiply(6, 7), 42);
  });

  await t.test('divides numbers correctly', () => {
    assert.strictEqual(calc.divide(20, 4), 5);
  });

  await t.test('throws descriptive error on division by zero', () => {
    assert.throws(() => calc.divide(10, 0), /DIVISION_BY_ZERO/);
  });

  await t.test('calculates percentages correctly (regression test)', () => {
    assert.strictEqual(calc.percentage(25, 100), 25);
    assert.strictEqual(calc.percentage(1, 2), 50);
  });
});
