# Salary Benchmark Model Specification

## 1. Overview
The Salary Benchmark Model stores verified labor compensation ranges mapped to standardized market roles across defined geographic regions and experience levels.

## 2. Benchmark Schema
```typescript
export interface SalaryBenchmark {
  benchmarkId: string;
  marketRoleId: string;
  marketRoleTitle: string;
  location: string;
  country: string;
  region?: string;
  currency: 'IDR' | 'USD';
  salaryMin: number;      // 25th percentile / low scenario
  salaryMedian: number;   // 50th percentile / median scenario
  salaryMax: number;      // 75th-90th percentile / high scenario
  experienceLevel: ExperienceLevel;
  employmentType: EmploymentType;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourceTier: ReliabilityTier;
  publicationDate: string;
  retrievalDate: string;
  effectivePeriod: string;
  isCurrent: boolean;
  isStale: boolean;
  confidence: BenchmarkConfidence;
  notes?: string;
  version: number;
}
```

## 3. Snapshotting & Immutability
To preserve historical traceability, any modification to a benchmark creates a `SalaryBenchmarkSnapshot` record:
- Captured at point of edit.
- Retains original salary numbers, source ID, retrieved timestamp, and justification reason.
- Guarantees historical consistency for past audits.
