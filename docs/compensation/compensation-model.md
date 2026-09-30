# Compensation Model Specification

## 1. Actual Human Compensation Input Model
Actual human compensation is treated strictly as an empirical input for simulation and comparative benchmarking:

```typescript
export interface ActualCompensation {
  baseSalary: number;     // Core guaranteed monthly base (IDR)
  allowances: number;     // Fixed transport, meal, and position allowances
  bonuses: number;        // Variable or annualized bonus allocation
  other: number;          // Miscellaneous benefits
  totalMonthly: number;   // Calculated sum
  currency: 'IDR' | 'USD';
}
```

---

## 2. Virtual AI Employee Compensation Simulation
For autonomous agents (Farhan, Rian, Ahmad, Nadia, Maya), compensation is modeled according to KDI internal engineering grades:

$$\text{Total Virtual Compensation} = \text{Base Virtual Salary} + \text{Fixed Allowance} + \text{Performance Incentive}$$

This simulated number serves as a normalized benchmark of agent capability and task complexity; it does not represent real-world payroll disbursements.
