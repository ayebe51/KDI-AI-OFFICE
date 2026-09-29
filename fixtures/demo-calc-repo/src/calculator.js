// ==========================================================
// fixtures/demo-calc-repo/src/calculator.js
// Demo Calculator Service with Known Bug
// ==========================================================

export class Calculator {
  add(a, b) {
    return a + b;
  }

  subtract(a, b) {
    return a - b;
  }

  multiply(a, b) {
    return a * b;
  }

  /**
   * Division method
   * BUG: Does not check for division by zero, throws uncaught error or returns Infinity
   */
  divide(a, b) {
    if (b === 0) {
      throw new Error('DIVISION_BY_ZERO: Cannot divide by zero');
    }
    return a / b;
  }

  /**
   * Percentage calculation
   * BUG: Originally returned (part / total) without multiplying by 100
   */
  percentage(part, total) {
    if (total === 0) {
      return 0;
    }
    return (part / total) * 100;
  }
}
